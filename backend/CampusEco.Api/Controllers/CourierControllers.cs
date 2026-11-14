using CampusEco.Api.Data;
using CampusEco.Api.Dtos;
using CampusEco.Api.Models;
using CampusEco.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusEco.Api.Controllers;

// Courier portal endpoints (Braden). These replace everything the courier pages
// used to keep in localStorage: the courier profile, claims, and the cart fleet.

// Rules shared by the courier endpoints (same rules as the old Dispatch object in courierModels.js).
internal static class CourierRules
{
    // A package is still at the hub while it is Checked In or Awaiting Pickup.
    public static bool AtHub(Package p) =>
        p.Status is PackageStatus.CheckedIn or PackageStatus.AwaitingPickup;

    // The order a courier moves a delivery through once it is claimed.
    private static readonly string[] Flow = { "Claimed", "Loaded", "En Route", "Delivered" };

    public static string StatusText(PackageStatus s) => s switch
    {
        PackageStatus.CheckedIn => "Checked In",
        PackageStatus.AwaitingPickup => "Awaiting Pickup",
        PackageStatus.EnRoute => "En Route",
        _ => s.ToString()
    };

    // What the courier sees: a claimed package still at the hub shows "Claimed".
    public static string DisplayStatus(Package p) =>
        AtHub(p) && p.Claim is not null ? "Claimed" : StatusText(p.Status);

    // Statuses the package may move to next. Couriers can only move forward.
    public static List<string> NextStatuses(Package p)
    {
        if (p.Claim is null) return new();
        var index = Array.IndexOf(Flow, DisplayStatus(p));
        return index == -1 ? new() : Flow.Skip(index + 1).ToList();
    }

    public static CourierPackageDto ToDto(Package p)
    {
        var timeline = p.History
            .Select(h => new TimelineItemDto(StatusText(h.Status), Utc(h.Timestamp), h.Description ?? ""))
            .ToList();
        if (p.Claim is not null)
        {
            timeline.Add(new TimelineItemDto("Claimed", Utc(p.Claim.ClaimedAt),
                "by " + p.Claim.Courier.Name + " on " + p.Claim.Cart.Name));
        }

        var group = p.Status switch
        {
            PackageStatus.Delivered => "delivered",
            PackageStatus.Cancelled => "cancelled",
            _ => "active"
        };

        return new CourierPackageDto(
            p.Barcode,
            p.BuildingCode,
            p.Building?.Name ?? p.BuildingCode,
            p.LockerId,
            p.WeightLb,
            p.Priority,
            p.Status,
            DisplayStatus(p),
            NextStatuses(p),
            group,
            p.Cart?.Name ?? p.Claim?.Cart.Name,
            p.Cart?.BatteryPercentage ?? p.Claim?.Cart.BatteryPercentage,
            p.Claim?.Courier.Name,
            p.Claim is null ? null : Utc(p.Claim.ClaimedAt),
            timeline.OrderBy(t => t.At).ToList());
    }

    // MySQL returns DATETIME without a time zone; tag it as UTC so JSON ends in "Z".
    public static DateTime Utc(DateTime d) => DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public static readonly string[] AllowedIssues = { "charge", "slow", "warning" };
}

[ApiController]
[Route("api/couriers")]
public class CouriersController : ControllerBase
{
    private readonly CampusEcoContext _db;
    public CouriersController(CampusEcoContext db) => _db = db;

    private IQueryable<Package> PackagesWithDetails() =>
        _db.Packages
            .Include(p => p.Building)
            .Include(p => p.Cart)
            .Include(p => p.History)
            .Include(p => p.Claim).ThenInclude(c => c!.Courier)
            .Include(p => p.Claim).ThenInclude(c => c!.Cart);

    // POST /api/couriers   (courierRegister.html: create an account)
    [HttpPost]
    public async Task<ActionResult<CourierDto>> Register(RegisterCourierRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.Couriers.AnyAsync(c => c.Email == email))
            return Conflict(new { error = "A courier with that email is already registered." });

        var courier = new Courier
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Shift = request.Shift!.Value,
            Role = request.Role!.Value,
            RegisteredAt = DateTime.UtcNow
        };
        _db.Couriers.Add(courier);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = courier.Id }, CourierDto.From(courier));
    }

    // POST /api/couriers/signin   (courierRegister.html: sign in to an existing account)
    [HttpPost("signin")]
    public async Task<ActionResult<CourierDto>> SignIn(SignInRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var courier = await _db.Couriers.FirstOrDefaultAsync(c => c.Email == email);
        if (courier is null || !PasswordHasher.Verify(request.Password, courier.PasswordHash))
            return Unauthorized(new { error = "Email or password is incorrect." });
        return CourierDto.From(courier);
    }

    // GET /api/couriers/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CourierDto>> Get(int id)
    {
        var courier = await _db.Couriers.FindAsync(id);
        if (courier is null) return NotFound(new { error = "No such courier" });
        return CourierDto.From(courier);
    }

    // GET /api/couriers/1/deliveries   (courier.html: My Deliveries table and the route map)
    [HttpGet("{id:int}/deliveries")]
    public async Task<ActionResult<List<CourierPackageDto>>> Deliveries(int id)
    {
        if (!await _db.Couriers.AnyAsync(c => c.Id == id))
            return NotFound(new { error = "No such courier" });

        var packages = await PackagesWithDetails()
            .Where(p => p.Claim != null && p.Claim.CourierId == id)
            .ToListAsync();

        // Most urgent first, then the order they were claimed.
        return packages
            .OrderByDescending(p => p.Priority)
            .ThenBy(p => p.Claim!.ClaimedAt)
            .Select(CourierRules.ToDto)
            .ToList();
    }

    // POST /api/couriers/1/claims   body: { "barcode": "1234-5678-9012", "cartId": 1, "verifiedWeightLb": 8.5 }
    [HttpPost("{id:int}/claims")]
    public async Task<ActionResult<CourierPackageDto>> Claim(int id, ClaimRequest request)
    {
        var courier = await _db.Couriers.FindAsync(id);
        if (courier is null) return NotFound(new { error = "No such courier" });

        var pkg = await PackagesWithDetails().FirstOrDefaultAsync(p => p.Barcode == request.Barcode);
        if (pkg is null) return NotFound(new { error = "Package " + request.Barcode + " was not found." });
        if (!CourierRules.AtHub(pkg) || pkg.Claim is not null)
            return Conflict(new { error = "Package " + request.Barcode + " is not waiting in the route queue." });

        var cart = await _db.Carts.FindAsync(request.CartId!.Value);
        if (cart is null) return BadRequest(new { error = "Please choose a cart." });
        if (cart.NeedsCharge)
            return BadRequest(new { error = cart.Name + " needs to be charged before it can take a delivery." });

        var weight = request.VerifiedWeightLb ?? pkg.WeightLb;
        if (weight > courier.MaxLoadLb)
            return BadRequest(new { error = courier.RoleLabel + "s can carry up to " + courier.MaxLoadLb + " lb." });

        pkg.Claim = new Claim
        {
            CourierId = courier.Id,
            Courier = courier,
            CartId = cart.Id,
            Cart = cart,
            VerifiedWeightLb = request.VerifiedWeightLb,
            ClaimedAt = DateTime.UtcNow
        };
        if (request.VerifiedWeightLb.HasValue) pkg.WeightLb = request.VerifiedWeightLb.Value;

        await _db.SaveChangesAsync();
        return CourierRules.ToDto(pkg);
    }

    // PATCH /api/couriers/1/deliveries/1234-5678-9012/status   body: { "status": "Loaded", "notes": "..." }
    [HttpPatch("{id:int}/deliveries/{barcode}/status")]
    public async Task<ActionResult<CourierPackageDto>> UpdateStatus(int id, string barcode, CourierStatusRequest request)
    {
        var pkg = await PackagesWithDetails().FirstOrDefaultAsync(p => p.Barcode == barcode);
        if (pkg is null) return NotFound(new { error = "Package " + barcode + " was not found." });
        if (pkg.Claim is null || pkg.Claim.CourierId != id)
            return Conflict(new { error = "You haven't claimed " + barcode + "." });

        var newStatus = request.Status!.Value;
        var newText = CourierRules.StatusText(newStatus);
        if (!CourierRules.NextStatuses(pkg).Contains(newText))
            return Conflict(new { error = "Cannot change " + barcode + " from \"" + CourierRules.DisplayStatus(pkg) + "\" to \"" + newText + "\"." });

        var cartName = pkg.Claim.Cart.Name;
        string location = "Central Hub";
        string description;
        switch (newStatus)
        {
            case PackageStatus.Loaded:
                pkg.CartId = pkg.Claim.CartId;   // the package now rides on the claimed cart
                pkg.Cart = pkg.Claim.Cart;
                description = "Loaded onto " + cartName;
                break;
            case PackageStatus.EnRoute:
                pkg.CartId = pkg.Claim.CartId;
                pkg.Cart = pkg.Claim.Cart;
                pkg.RouteIndex = 0;              // the tracking map starts the cart at the hub
                description = cartName + " left the hub";
                break;
            default: // Delivered
                location = pkg.BuildingCode;
                description = "Delivered to " + pkg.LockerId;
                break;
        }
        var notes = request.Notes?.Trim();
        if (!string.IsNullOrEmpty(notes)) description = notes;

        pkg.Status = newStatus;
        pkg.History.Add(new PackageHistory
        {
            Status = newStatus,
            Timestamp = DateTime.UtcNow,
            Location = location,
            Description = description
        });

        await _db.SaveChangesAsync();
        return CourierRules.ToDto(pkg);
    }
}

[ApiController]
[Route("api/courier")]
public class CourierQueueController : ControllerBase
{
    private readonly CampusEcoContext _db;
    public CourierQueueController(CampusEcoContext db) => _db = db;

    // GET /api/courier/queue   (courier.html: route queue, packages at the hub that nobody has claimed)
    [HttpGet("queue")]
    public async Task<ActionResult<List<CourierPackageDto>>> Queue()
    {
        var packages = await _db.Packages
            .Include(p => p.Building)
            .Include(p => p.Cart)
            .Include(p => p.History)
            .Where(p => (p.Status == PackageStatus.CheckedIn || p.Status == PackageStatus.AwaitingPickup) && p.Claim == null)
            .ToListAsync();

        // Most urgent first.
        return packages
            .OrderByDescending(p => p.Priority)
            .ThenBy(p => p.Barcode)
            .Select(CourierRules.ToDto)
            .ToList();
    }

    // GET /api/courier/carts   (cart dropdowns and the Cart Battery Status cards)
    [HttpGet("carts")]
    public async Task<ActionResult<List<CourierCartDto>>> Carts()
    {
        var carts = await _db.Carts.Include(c => c.BatteryReports).OrderBy(c => c.Name).ToListAsync();
        return carts.Select(CourierCartDto.From).ToList();
    }

    // POST /api/courier/carts/2/battery-reports   (courierUpdate.html: Report Battery Status)
    // body: { "batteryPercentage": 15, "reportType": "Mid", "issues": ["charge"], "courierId": 1 }
    [HttpPost("carts/{cartId:int}/battery-reports")]
    public async Task<ActionResult<CourierCartDto>> ReportBattery(int cartId, BatteryReportRequest request)
    {
        var cart = await _db.Carts.Include(c => c.BatteryReports).FirstOrDefaultAsync(c => c.Id == cartId);
        if (cart is null) return NotFound(new { error = "Please choose a cart." });

        var issues = request.Issues.Select(i => i.Trim().ToLowerInvariant()).Distinct().ToList();
        var unknown = issues.Where(i => !CourierRules.AllowedIssues.Contains(i)).ToList();
        if (unknown.Count > 0) return BadRequest(new { error = "Unknown issue: " + string.Join(", ", unknown) });

        if (request.CourierId.HasValue && !await _db.Couriers.AnyAsync(c => c.Id == request.CourierId.Value))
            return BadRequest(new { error = "No such courier" });

        var level = request.BatteryPercentage!.Value;
        var issueText = string.Join(",", CourierRules.AllowedIssues.Where(issues.Contains));

        cart.BatteryPercentage = level;
        cart.Issues = issueText;
        cart.BatteryReports.Add(new BatteryReport
        {
            CourierId = request.CourierId,
            BatteryPercentage = level,
            ReportType = request.ReportType!.Value,
            Issues = issueText,
            ReportedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return CourierCartDto.From(cart);
    }
}