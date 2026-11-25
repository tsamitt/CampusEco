
using System.ComponentModel.DataAnnotations;
using CampusEco.Api.Models;

namespace CampusEco.Api.Dtos;

public record OperatorDto(
    int Id,
    string Name,
    string Email,
    DateTime RegisteredAt)
{
    public static OperatorDto From(Operator o) => new(
        o.Id,
        o.Name,
        o.Email,
        DateTime.SpecifyKind(o.RegisteredAt, DateTimeKind.Utc));
}

public class RegisterOperatorRequest
{
    [Required, StringLength(80, MinimumLength = 1)]
    public string Name { get; set; } = "";

    [Required, StringLength(120)]
    [RegularExpression(
        @"^[^\s@]+@mnsu\.edu$",
        ErrorMessage = "Please use your @mnsu.edu email address.")]
    public string Email { get; set; } = "";

    [Required, StringLength(100, MinimumLength = 8,
        ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = "";
}

public class OperatorSignInRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    public string Password { get; set; } = "";
}
