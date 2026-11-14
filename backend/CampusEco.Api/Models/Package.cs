namespace CampusEco.Api.Models;

public class Package
{
    public int Id { get; set; }
    public string Barcode { get; set; } = "";

    public string LockerId { get; set; } = "";
    public string BuildingCode { get; set; } = "";
    public Building? Building { get; set; }

    public double LengthIn { get; set; }
    public double WidthIn { get; set; }
    public double HeightIn { get; set; }
    public double WeightLb { get; set; }

    public PackagePriority Priority { get; set; } = PackagePriority.Standard;
    public PackageStatus Status { get; set; } = PackageStatus.CheckedIn;

    // Nullable: a package that was just checked in has no cart yet.
    public int? CartId { get; set; }
    public DeliveryCart? Cart { get; set; }

    // How far along its route the cart is (used by the cart simulation on the front end).
    public int RouteIndex { get; set; }

    public string SpecialInstructions { get; set; } = "";

    public ICollection<PackageHistory> History { get; set; } = new List<PackageHistory>();

    // Courier who claimed this package (null while it waits in the route queue).
    public Claim? Claim { get; set; }
}
