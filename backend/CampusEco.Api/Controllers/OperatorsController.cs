
using CampusEco.Api.Data;
using CampusEco.Api.Dtos;
using CampusEco.Api.Models;
using CampusEco.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusEco.Api.Controllers;

[ApiController]
[Route("api/operators")]
public class OperatorsController : ControllerBase
{
    private readonly CampusEcoContext _db;

    public OperatorsController(CampusEcoContext db)
    {
        _db = db;
    }

    // POST /api/operators
    // Register a new operator.
    [HttpPost]
    public async Task<ActionResult<OperatorDto>> Register(
        RegisterOperatorRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Operators.AnyAsync(o => o.Email == email))
        {
            return Conflict(new
            {
                error = "An operator with that email is already registered."
            });
        }

        var op = new Operator
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.Hash(request.Password),
            RegisteredAt = DateTime.UtcNow
        };

        _db.Operators.Add(op);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(Get),
            new { id = op.Id },
            OperatorDto.From(op));
    }

    // POST /api/operators/signin
    // Sign in an existing operator.
    [HttpPost("signin")]
    public async Task<ActionResult<OperatorDto>> SignIn(
        OperatorSignInRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var op = await _db.Operators
            .FirstOrDefaultAsync(o => o.Email == email);

        if (op is null ||
            !PasswordHasher.Verify(request.Password, op.PasswordHash))
        {
            return Unauthorized(new
            {
                error = "Email or password is incorrect."
            });
        }

        return OperatorDto.From(op);
    }

    // GET /api/operators/1
    // Retrieve an operator profile.
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OperatorDto>> Get(int id)
    {
        var op = await _db.Operators.FindAsync(id);

        if (op is null)
        {
            return NotFound(new
            {
                error = "No such operator"
            });
        }

        return OperatorDto.From(op);
    }
}
