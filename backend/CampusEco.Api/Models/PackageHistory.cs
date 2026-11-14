namespace CampusEco.Api.Models;

public class PackageHistory
{
    public int Id { get; set; }

    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;

    public PackageStatus Status { get; set; }

    // Always stored in UTC.
    public DateTime Timestamp { get; set; }

    public string? Location { get; set; }
    public string? Description { get; set; }
}
