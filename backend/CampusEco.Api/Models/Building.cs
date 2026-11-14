namespace CampusEco.Api.Models;

// Replaces the static BuildingLookup dictionary: buildings are now rows in the database.
public class Building
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}
