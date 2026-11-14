using System.ComponentModel.DataAnnotations;
using CampusEco.Api.Models;

namespace CampusEco.Api.Dtos;

public record CourierDto(
    int Id,
    string Name,
    string Email,
    CourierShift Shift,
    CourierRole Role,
    string RoleLabel,
    double MaxLoadLb,
    DateTime RegisteredAt)
{
    public static CourierDto From(Courier c) => new(
        c.Id, c.Name, c.Email, c.Shift, c.Role, c.RoleLabel, c.MaxLoadLb,
        DateTime.SpecifyKind(c.RegisteredAt, DateTimeKind.Utc));
}

public class RegisterCourierRequest
{
    [Required, StringLength(80, MinimumLength = 1)]
    public string Name { get; set; } = "";

    [Required, StringLength(120)]
    [RegularExpression(@"^[^\s@]+@mnsu\.edu$", ErrorMessage = "Please use your @mnsu.edu email address.")]
    public string Email { get; set; } = "";

    [Required, StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = "";

    [Required] public CourierShift? Shift { get; set; }
    [Required] public CourierRole? Role { get; set; }
}

public class SignInRequest
{
    [Required] public string Email { get; set; } = "";
    [Required] public string Password { get; set; } = "";
}

// A cart as the courier pages show it: battery level, issues and whether it can take a delivery.
public record CourierCartDto(
    int Id,
    string Name,
    double BatteryPercentage,
    string BatteryState,
    bool NeedsCharge,
    List<string> Issues,
    BatteryReportType? LastReportType,
    DateTime? LastReportAt)
{
    // Expects BatteryReports to be loaded (Include) before calling.
    public static CourierCartDto From(DeliveryCart c)
    {
        var last = c.BatteryReports.OrderByDescending(r => r.ReportedAt).FirstOrDefault();
        return new(
            c.Id, c.Name, c.BatteryPercentage, c.BatteryState, c.NeedsCharge,
            c.Issues.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            last?.ReportType,
            last is null ? null : DateTime.SpecifyKind(last.ReportedAt, DateTimeKind.Utc));
    }
}

public record TimelineItemDto(string Status, DateTime At, string Notes);

// A package as the courier pages show it (route queue and My Deliveries).
public record CourierPackageDto(
    string Barcode,
    string BuildingCode,
    string BuildingName,
    string LockerId,
    double WeightLb,
    PackagePriority Priority,
    PackageStatus Status,
    string DisplayStatus,        // "Claimed" while a claimed package is still at the hub
    List<string> NextStatuses,   // what the courier may move it to next
    string Group,                // "delivered", "cancelled" or "active" (for the Hide delivered checkbox)
    string? CartName,
    double? CartBatteryPercentage,
    string? ClaimedBy,
    DateTime? ClaimedAt,
    List<TimelineItemDto> Timeline);

public class ClaimRequest
{
    [Required, RegularExpression(@"^\d{4}-\d{4}-\d{4}$", ErrorMessage = "Barcode must look like 1234-5678-9012.")]
    public string Barcode { get; set; } = "";

    [Required] public int? CartId { get; set; }

    [Range(0.1, 500)] public double? VerifiedWeightLb { get; set; }
}

public class CourierStatusRequest
{
    // "Loaded", "En Route" or "Delivered"
    [Required] public PackageStatus? Status { get; set; }

    [StringLength(250)] public string? Notes { get; set; }
}

public class BatteryReportRequest
{
    [Required, Range(0, 100, ErrorMessage = "Battery level must be between 0 and 100.")]
    public double? BatteryPercentage { get; set; }

    [Required] public BatteryReportType? ReportType { get; set; }

    // Any of "charge", "slow", "warning"
    public List<string> Issues { get; set; } = new();

    // The signed-in courier, if any.
    public int? CourierId { get; set; }
}