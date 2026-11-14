namespace CampusEco.Api.Models;

public class UserPreferences
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public bool NotifyEmail { get; set; }
    public bool NotifyText { get; set; }
    public string Phone { get; set; } = "";

    public DeliveryWindow PreferredWindow { get; set; } = DeliveryWindow.None;
    public string? PreferredBuildingCode { get; set; }
    public LockerFallback FallbackPreference { get; set; } = LockerFallback.Hold;
    public bool SignatureOnFile { get; set; }
}
