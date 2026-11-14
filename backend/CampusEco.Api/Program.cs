using System.Text.Json.Serialization;
using CampusEco.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:Default in appsettings.json");

// MySQL 8.4 LTS is the team version. The explicit version means the app starts even if MySQL is not running yet.
builder.Services.AddDbContext<CampusEcoContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 4, 0))));

builder.Services.AddControllers().AddJsonOptions(options =>
    // Enums travel as text, for example "En Route", matching the React pages.
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Allow the React dev server (a different port) to call this API from the browser.
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
    options.AddPolicy("react", policy => policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors("react");
app.MapControllers();

// GET /api/health: quick check that the API is up and can reach MySQL.
app.MapGet("/api/health", async (CampusEcoContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    return canConnect
        ? Results.Ok(new { api = "up", database = "connected" })
        : Results.Json(new { api = "up", database = "unreachable" }, statusCode: 503);
});

app.Run();
