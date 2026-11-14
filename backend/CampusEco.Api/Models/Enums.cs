using System.Text.Json.Serialization;

namespace CampusEco.Api.Models;

// The JSON text matches the status strings the React front end already uses ("En Route", ...).
// The database stores the enum NAME (EnRoute), see CampusEcoContext.
public enum PackageStatus
{
    [JsonStringEnumMemberName("Checked In")] CheckedIn,
    [JsonStringEnumMemberName("Awaiting Pickup")] AwaitingPickup,
    Loaded,
    [JsonStringEnumMemberName("En Route")] EnRoute,
    Delivered,
    Cancelled
}

public enum PackagePriority
{
    Low,
    Standard,
    Urgent
}

public enum DeliveryWindow
{
    None,
    Morning,
    Midday,
    Afternoon
}

public enum LockerFallback
{
    Hold,
    Nearest
}

public enum CourierShift
{
    Morning,
    Midday,
    Afternoon
}

public enum CourierRole
{
    Driver,
    Walker
}

public enum BatteryReportType
{
    Start,
    Mid,
    End
}