using CampusEco.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusEco.Api.Data;

public class CampusEcoContext : DbContext
{
    public CampusEcoContext(DbContextOptions<CampusEcoContext> options) : base(options) { }

    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageHistory> PackageHistory => Set<PackageHistory>();
    public DbSet<DeliveryCart> Carts => Set<DeliveryCart>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<UserPreferences> Preferences => Set<UserPreferences>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Table names match db/01_schema.sql.
        b.Entity<Package>().ToTable("Packages");
        b.Entity<PackageHistory>().ToTable("PackageHistory");
        b.Entity<DeliveryCart>().ToTable("Carts");
        b.Entity<Building>().ToTable("Buildings").HasKey(x => x.Code);
        b.Entity<UserPreferences>().ToTable("Preferences");

        // Enums are stored as text (the enum name) so the database is readable.
        b.Entity<Package>().Property(p => p.Status).HasConversion<string>();
        b.Entity<Package>().Property(p => p.Priority).HasConversion<string>();
        b.Entity<PackageHistory>().Property(h => h.Status).HasConversion<string>();
        b.Entity<UserPreferences>().Property(p => p.PreferredWindow).HasConversion<string>();
        b.Entity<UserPreferences>().Property(p => p.FallbackPreference).HasConversion<string>();

        b.Entity<Package>().HasIndex(p => p.Barcode).IsUnique();
        b.Entity<Package>().HasOne(p => p.Building).WithMany().HasForeignKey(p => p.BuildingCode);
        b.Entity<Package>().HasOne(p => p.Cart).WithMany(c => c.Packages).HasForeignKey(p => p.CartId);
        b.Entity<PackageHistory>().HasOne(h => h.Package).WithMany(p => p.History).HasForeignKey(h => h.PackageId);
    }
}
