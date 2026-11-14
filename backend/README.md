# CampusEco backend (C# + MySQL)

ASP.NET Core Web API (the controllers part of MVC, no Razor views) backed by MySQL.
React owns the UI. This API only reads and writes data and returns JSON.

```
React (localhost:5173)  --fetch/JSON-->  C# API (localhost:5080)  --EF Core-->  MySQL (localhost:3306, database "campuseco")
```

## Versions everyone installs (so we all match)

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.0 (LTS), latest 10.0.x | Check with `dotnet --version`. The project targets `net10.0`. |
| MySQL Server | 8.4 LTS | MySQL 8.0 reached end of life in April 2026, so use 8.4. |
| EF Core packages | **9.0.21 (pinned)** | Do NOT upgrade to 10.x. See the warning below. |
| MySQL provider | Pomelo.EntityFrameworkCore.MySql 9.0.0 | Newest Pomelo release; it only works with EF Core 9. |
| Editor | VS Code (C# Dev Kit extension) or Visual Studio 2022/2026 | Either works. |

**Why the EF Core version is pinned:** Pomelo has no EF Core 10 build. If you add or update an EF Core package to 10.x,
`dotnet restore` fails (NU1107) or the app crashes at runtime with a MissingMethodException. Leave the versions in
`CampusEco.Api.csproj` alone. EF Core 9 support officially ends Nov 10, 2026, which is fine for this course project.
(Source: https://startdebugging.net/2026/10/fix-nu1608-nu1107-version-conflict-pomelo-entityframeworkcore-mysql-ef-core-10/ )

Shared settings (the same on every computer):

| Setting | Value |
|---|---|
| Database name | `campuseco` |
| Login | user `campuseco`, password `campuseco_dev` (local throwaway database, safe to commit) |
| MySQL port | 3306 |
| API address | http://localhost:5080 |
| React dev server (allowed by CORS) | http://localhost:5173 and 5174 |

## One-time setup

1. Install the .NET 10 SDK: https://dotnet.microsoft.com/download
2. Install MySQL Server 8.4 LTS (MySQL Installer on Windows). Choose "Server only" (Workbench is optional) and remember the root password you set.
3. Open a terminal in this folder and run the three scripts. **PowerShell does not support `<` redirection**, so use `source`:
   ```
   mysql -u root -p -e "source db/00_create_database_and_user.sql"
   mysql -u campuseco -pcampuseco_dev campuseco -e "source db/01_schema.sql"
   mysql -u campuseco -pcampuseco_dev campuseco -e "source db/02_seed.sql"
   ```
   If `mysql` is not recognized, open "MySQL 8.4 Command Line Client" from the Start menu, or add
   `C:\Program Files\MySQL\MySQL Server 8.4\bin` to your PATH. In MySQL Workbench you can instead open each
   `.sql` file and run it (the first as root, the others as `campuseco`).
4. Run the API:
   ```
   cd CampusEco.Api
   dotnet run
   ```
5. Check it: open http://localhost:5080/api/health. You should see `{"api":"up","database":"connected"}`.
   Then http://localhost:5080/api/packages should list 5 sample packages.

**Reset the demo data any time:** run `01_schema.sql` then `02_seed.sql` again (01 drops and recreates the tables).

## Endpoints

| Method | URL | What it does |
|---|---|---|
| GET | /api/health | API and database status |
| GET | /api/packages?status=EnRoute&building=AH | List packages (filters optional; the status filter uses the enum name, for example `EnRoute`) |
| GET | /api/packages/{barcode} | One package with its history |
| POST | /api/packages | Operator check-in (validates barcode, building, duplicates) |
| PATCH | /api/packages/{barcode}/status | Courier status update (adds a history row) |
| GET | /api/buildings | The 28 campus buildings |
| GET | /api/carts | Carts and battery levels |
| GET / PUT | /api/preferences/{userId} | End-User delivery preferences |

`requests.http` has ready-made requests for each one (VS Code "REST Client" extension).

JSON looks like what the React pages already use: `"status": "En Route"`, ISO timestamps ending in `Z` (UTC).
JSON field names are camelCase (`buildingCode`, `lockerId`). `Models.js` uses `building` and `locker`, so
`PackageStore` needs a small mapping when it is switched to `fetch`.

## Project layout

- `db/` SQL scripts (the database is created from these, not from EF migrations, so there is one source of truth)
- `CampusEco.Api/Models/` the C# classes (Caleb's models plus the fixes below)
- `CampusEco.Api/Data/CampusEcoContext.cs` maps the classes to the tables
- `CampusEco.Api/Dtos/` request and response shapes sent over JSON
- `CampusEco.Api/Controllers/` the endpoints

## Changes from Caleb's first models

- `Package.CartId` is nullable (a new package has no cart)
- `Package.RouteIndex` added (the cart simulation needs it)
- `BuildingLookup` became a `Buildings` table (all 28 buildings) with a foreign key from packages
- Barcodes are unique; status and priority are checked by the database
- History timestamps are UTC
- Enums are stored as text and sent as the same text the React pages use

## Not built yet

Receipts (sign-off), couriers and claims, users and login, a package owner (for "my packages"), edit and cancel endpoints
(cancel is just a status update to `Cancelled`), and switching the React `PackageStore` to `fetch`.

## What was and was not tested

Tested: the three SQL scripts on a real MySQL server (8.0.46, since that was installable in the test environment; they use
only features that exist in 8.4), including re-running them and the duplicate, foreign key and status constraints.
Compiled with the .NET 10 compiler against stand-ins for Entity Framework, and the JSON output (status text, UTC
timestamps, validation messages) was checked with the real .NET serializer.
**Not tested:** `dotnet restore` and a live run against MySQL, because NuGet was not reachable in the test environment.
The first person to run it should report any restore or build error in the group chat; the likeliest fix is a package version.
