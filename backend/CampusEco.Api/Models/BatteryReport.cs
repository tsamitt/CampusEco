namespace CampusEco.Api.Models;

// Courier portal (Braden): one battery report for a cart.
// The cart row keeps the latest level and issues; this table keeps the history.
public class BatteryReport
{
    public int Id { get; set; }

    public int CartId { get; set; }
    public DeliveryCart Cart { get; set; } = null!;

    // Null if the courier was not signed in.
    public int? CourierId { get; set; }
    public Courier? Courier { get; set; }

    public double BatteryPercentage { get; set; }
    public BatteryReportType ReportType { get; set; }

    // Comma separated: "charge,slow,warning"
    public string Issues { get; set; } = "";

    // Always stored in UTC.
    public DateTime ReportedAt { get; set; }
}