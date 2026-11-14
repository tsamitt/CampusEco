namespace CampusEco.Api.Models;

public class DeliveryCart
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public double BatteryPercentage { get; set; }
    public string? CurrentBuildingCode { get; set; }

    // Courier portal: issues from the latest battery report, comma separated ("charge,slow").
    public string Issues { get; set; } = "";

    public ICollection<BatteryReport> BatteryReports { get; set; } = new List<BatteryReport>();

    // Same rules as the EcoCart model the courier pages used before.
    public bool NeedsCharge => BatteryPercentage < 20 || Issues.Split(',').Contains("charge");
    public string BatteryState => BatteryPercentage < 20 ? "critical" : BatteryPercentage < 50 ? "low" : "good";

    public ICollection<Package> Packages { get; set; } = new List<Package>();
}
