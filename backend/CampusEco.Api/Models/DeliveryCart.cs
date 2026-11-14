namespace CampusEco.Api.Models;

public class DeliveryCart
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public double BatteryPercentage { get; set; }
    public string? CurrentBuildingCode { get; set; }

    public ICollection<Package> Packages { get; set; } = new List<Package>();
}
