using CampusEco.Api.Data;
using CampusEco.Api.Dtos;
using CampusEco.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusEco.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildingsController : ControllerBase
{
    private readonly CampusEcoContext _db;
    public BuildingsController(CampusEcoContext db) => _db = db;

    // GET /api/buildings
    [HttpGet]
    public async Task<ActionResult<List<Building>>> GetAll() =>
        await _db.Buildings.OrderBy(b => b.Code).ToListAsync();
}

[ApiController]
[Route("api/[controller]")]
public class CartsController : ControllerBase
{
    private readonly CampusEcoContext _db;
    public CartsController(CampusEcoContext db) => _db = db;

    public record CartDto(int Id, string Name, double BatteryPercentage, string? CurrentBuildingCode);

    // GET /api/carts
    [HttpGet]
    public async Task<ActionResult<List<CartDto>>> GetAll() =>
        await _db.Carts
            .OrderBy(c => c.Name)
            .Select(c => new CartDto(c.Id, c.Name, c.BatteryPercentage, c.CurrentBuildingCode))
            .ToListAsync();
}

[ApiController]
[Route("api/[controller]")]
public class PreferencesController : ControllerBase
{
    private readonly CampusEcoContext _db;
    public PreferencesController(CampusEcoContext db) => _db = db;

    private static PreferencesDto ToDto(UserPreferences p) => new(
        p.UserId, p.NotifyEmail, p.NotifyText, p.Phone, p.PreferredWindow,
        p.PreferredBuildingCode, p.FallbackPreference, p.SignatureOnFile);

    // GET /api/preferences/1
    [HttpGet("{userId:int}")]
    public async Task<ActionResult<PreferencesDto>> Get(int userId)
    {
        var prefs = await _db.Preferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs is null) return NotFound(new { error = "No preferences saved for that user" });
        return ToDto(prefs);
    }

    // PUT /api/preferences/1  (creates the row the first time, then updates it)
    [HttpPut("{userId:int}")]
    public async Task<ActionResult<PreferencesDto>> Save(int userId, PreferencesDto body)
    {
        if (body.NotifyText && string.IsNullOrWhiteSpace(body.Phone))
            return BadRequest(new { error = "A phone number is required for text notifications" });

        var code = string.IsNullOrWhiteSpace(body.PreferredBuildingCode) ? null : body.PreferredBuildingCode.Trim().ToUpperInvariant();
        if (code is not null && !await _db.Buildings.AnyAsync(b => b.Code == code))
            return BadRequest(new { error = "Unknown building code " + code });

        var prefs = await _db.Preferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs is null)
        {
            prefs = new UserPreferences { UserId = userId };
            _db.Preferences.Add(prefs);
        }

        prefs.NotifyEmail = body.NotifyEmail;
        prefs.NotifyText = body.NotifyText;
        prefs.Phone = body.Phone.Trim();
        prefs.PreferredWindow = body.PreferredWindow;
        prefs.PreferredBuildingCode = code;
        prefs.FallbackPreference = body.FallbackPreference;
        prefs.SignatureOnFile = body.SignatureOnFile;

        await _db.SaveChangesAsync();
        return ToDto(prefs);
    }
}
