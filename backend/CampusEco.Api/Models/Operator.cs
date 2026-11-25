
namespace CampusEco.Api.Models;

public class Operator
{
    public int Id { get; set; }

    public string Name { get; set; } = "";

    public string Email { get; set; } = "";

    // PBKDF2 hash. Never store the plain password.
    public string PasswordHash { get; set; } = "";

    // Always stored in UTC.
    public DateTime RegisteredAt { get; set; }
}
