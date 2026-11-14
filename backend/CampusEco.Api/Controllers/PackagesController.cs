using CampusEco.Api.Data;
using CampusEco.Api.Dtos;
using CampusEco.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusEco.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PackagesController : ControllerBase
{
    private readonly CampusEcoContext _db;

    public PackagesController(CampusEcoContext db) => _db = db;

    private IQueryable<Package> WithDetails() =>
        _db.Packages.Include(p => p.Building).Include(p => p.Cart).Include(p => p.History);

    // GET /api/packages?status=En Route&building=AH
    [HttpGet]
    public async Task<ActionResult<List<PackageDto>>> GetAll([FromQuery] PackageStatus? status, [FromQuery] string? building)
    {
        var query = WithDetails();
        if (status.HasValue) query = query.Where(p => p.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(building))
        {
            var code = building.Trim().ToUpperInvariant();
            query = query.Where(p => p.BuildingCode == code);
        }

        var packages = await query.OrderBy(p => p.Barcode).ToListAsync();
        return packages.Select(PackageDto.From).ToList();
    }

    // GET /api/packages/3141-5926-5358
    [HttpGet("{barcode}")]
    public async Task<ActionResult<PackageDto>> Get(string barcode)
    {
        var pkg = await WithDetails().FirstOrDefaultAsync(p => p.Barcode == barcode);
        if (pkg is null) return NotFound(new { error = "No such package" });
        return PackageDto.From(pkg);
    }

    // POST /api/packages  (Operator check-in)
    [HttpPost]
    public async Task<ActionResult<PackageDto>> Create(CreatePackageRequest request)
    {
        var code = request.BuildingCode.Trim().ToUpperInvariant();

        if (!await _db.Buildings.AnyAsync(b => b.Code == code))
            return BadRequest(new { error = "Unknown building code " + code });

        if (await _db.Packages.AnyAsync(p => p.Barcode == request.Barcode))
            return Conflict(new { error = "A package with that barcode already exists" });

        var pkg = new Package
        {
            Barcode = request.Barcode,
            LockerId = request.LockerId,
            BuildingCode = code,
            LengthIn = request.LengthIn,
            WidthIn = request.WidthIn,
            HeightIn = request.HeightIn,
            WeightLb = request.WeightLb,
            Priority = request.Priority,
            Status = PackageStatus.CheckedIn,
            SpecialInstructions = request.SpecialInstructions
        };
        pkg.History.Add(new PackageHistory
        {
            Status = PackageStatus.CheckedIn,
            Timestamp = DateTime.UtcNow,
            Location = "Central Hub",
            Description = "Package checked in"
        });

        _db.Packages.Add(pkg);
        await _db.SaveChangesAsync();

        var created = await WithDetails().FirstAsync(p => p.Id == pkg.Id);
        return CreatedAtAction(nameof(Get), new { barcode = pkg.Barcode }, PackageDto.From(created));
    }

    // PATCH /api/packages/3141-5926-5358/status   body: { "status": "Delivered" }
    [HttpPatch("{barcode}/status")]
    public async Task<ActionResult<PackageDto>> UpdateStatus(string barcode, UpdateStatusRequest request)
    {
        var pkg = await WithDetails().FirstOrDefaultAsync(p => p.Barcode == barcode);
        if (pkg is null) return NotFound(new { error = "No such package" });

        var newStatus = request.Status!.Value;

        if (pkg.Status is PackageStatus.Delivered or PackageStatus.Cancelled)
            return Conflict(new { error = "A " + pkg.Status + " package cannot change status" });

        pkg.Status = newStatus;
        pkg.History.Add(new PackageHistory
        {
            Status = newStatus,
            Timestamp = DateTime.UtcNow,
            Location = request.Location,
            Description = request.Description
        });

        await _db.SaveChangesAsync();
        return PackageDto.From(pkg);
    }
}
