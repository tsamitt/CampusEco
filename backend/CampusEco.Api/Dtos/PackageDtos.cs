using System.ComponentModel.DataAnnotations;
using CampusEco.Api.Models;

namespace CampusEco.Api.Dtos;

// What the API sends to React. Using DTOs (not the raw models) avoids Package <-> History
// reference loops in JSON and lets the database shape change without breaking the front end.
public record HistoryDto(PackageStatus Status, DateTime At, string? Location, string? Description);

public record PackageDto(
    int Id,
    string Barcode,
    string LockerId,
    string BuildingCode,
    string BuildingName,
    double LengthIn,
    double WidthIn,
    double HeightIn,
    double WeightLb,
    PackagePriority Priority,
    PackageStatus Status,
    int? CartId,
    string? CartName,
    double? CartBatteryPercentage,
    int RouteIndex,
    string SpecialInstructions,
    List<HistoryDto> History)
{
    // Expects Building, Cart and History to be loaded (Include) before calling.
    public static PackageDto From(Package p) => new(
        p.Id,
        p.Barcode,
        p.LockerId,
        p.BuildingCode,
        p.Building?.Name ?? p.BuildingCode,
        p.LengthIn,
        p.WidthIn,
        p.HeightIn,
        p.WeightLb,
        p.Priority,
        p.Status,
        p.CartId,
        p.Cart?.Name,
        p.Cart?.BatteryPercentage,
        p.RouteIndex,
        p.SpecialInstructions,
        p.History
            .OrderBy(h => h.Timestamp)
            // MySQL returns DATETIME without a time zone; tag it as UTC so JSON ends in "Z".
            .Select(h => new HistoryDto(h.Status, DateTime.SpecifyKind(h.Timestamp, DateTimeKind.Utc), h.Location, h.Description))
            .ToList());
}

public class CreatePackageRequest
{
    [Required, RegularExpression(@"^\d{4}-\d{4}-\d{4}$", ErrorMessage = "Barcode must look like 1234-5678-9012.")]
    public string Barcode { get; set; } = "";

    [Required, StringLength(40)]
    public string LockerId { get; set; } = "";

    [Required, RegularExpression(@"^[A-Za-z]{2}$", ErrorMessage = "Building code must be two letters.")]
    public string BuildingCode { get; set; } = "";

    [Range(0, 200)] public double LengthIn { get; set; }
    [Range(0, 200)] public double WidthIn { get; set; }
    [Range(0, 200)] public double HeightIn { get; set; }
    [Range(0, 500)] public double WeightLb { get; set; }

    public PackagePriority Priority { get; set; } = PackagePriority.Standard;

    [StringLength(500)] public string SpecialInstructions { get; set; } = "";
}

public class UpdateStatusRequest
{
    [Required] public PackageStatus? Status { get; set; }
    [StringLength(120)] public string? Location { get; set; }
    [StringLength(300)] public string? Description { get; set; }
}

public record PreferencesDto(
    int UserId,
    bool NotifyEmail,
    bool NotifyText,
    string Phone,
    DeliveryWindow PreferredWindow,
    string? PreferredBuildingCode,
    LockerFallback FallbackPreference,
    bool SignatureOnFile);
