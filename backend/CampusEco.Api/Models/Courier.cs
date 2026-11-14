namespace CampusEco.Api.Models;

// Courier portal (Braden): a student worker who delivers packages.
// Replaces the "campuseco.courier" localStorage profile.
public class Courier
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";

    // PBKDF2 hash made by PasswordHasher. The plain password is never stored.
    public string PasswordHash { get; set; } = "";

    public CourierShift Shift { get; set; }
    public CourierRole Role { get; set; } = CourierRole.Driver;

    // Always stored in UTC.
    public DateTime RegisteredAt { get; set; }

    public ICollection<Claim> Claims { get; set; } = new List<Claim>();

    public string RoleLabel => Role == CourierRole.Walker ? "Walking Courier" : "Delivery Driver";

    // Walking couriers can't carry as much as a cart driver.
    public double MaxLoadLb => Role == CourierRole.Walker ? 25 : 150;
}