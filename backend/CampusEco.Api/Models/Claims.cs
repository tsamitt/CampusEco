namespace CampusEco.Api.Models;

// Courier portal (Braden): a courier taking a package from the route queue.
// Replaces the "campuseco.courierClaims" localStorage object. One claim per package.
public class Claim
{
    public int Id { get; set; }

    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;

    public int CourierId { get; set; }
    public Courier Courier { get; set; } = null!;

    public int CartId { get; set; }
    public DeliveryCart Cart { get; set; } = null!;

    // The weight the courier checked when claiming (null if they did not enter one).
    public double? VerifiedWeightLb { get; set; }

    // Always stored in UTC.
    public DateTime ClaimedAt { get; set; }
}