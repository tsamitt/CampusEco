-- Demo data that mirrors the seed packages in public/Models.js.
--   mysql -u campuseco -pcampuseco_dev campuseco < db/02_seed.sql
-- Run 01_schema.sql first. Re-running 01 then 02 resets everything to this starting state.
INSERT INTO Buildings (Code, Name) VALUES
  ('AF', 'Alumni Foundation Center'),
  ('AH', 'Armstrong Hall'),
  ('CC', 'Carkoski Commons'),
  ('CR', 'Crawford Residence Community'),
  ('CS', 'Clinical Sciences Building'),
  ('FH', 'Ford Hall'),
  ('GP', 'Generator Plant'),
  ('HC', 'Highland Center'),
  ('HN', 'Highland Center North'),
  ('JS', 'Julia A. Sears Residence Community'),
  ('MC', 'McElroy Residence Community'),
  ('MF', 'Myers Field House'),
  ('MH', 'Morris Hall'),
  ('ML', 'Memorial Library'),
  ('NH', 'Nelson Hall'),
  ('PA', 'Earley Center for Performing Arts'),
  ('PH', 'Pennington Hall'),
  ('PS', 'Margaret R. Preska Residence Community'),
  ('SU', 'Centennial Student Union'),
  ('TC', 'Taylor Center'),
  ('TE', 'Trafton Science Center E'),
  ('TN', 'Trafton Science Center N'),
  ('TR', 'Trafton Science Center'),
  ('TS', 'Trafton Science Center S'),
  ('UP', 'Utility Plant'),
  ('WA', 'Wigley Administration Center'),
  ('WC', 'Wiecking Center'),
  ('WH', 'Wissink Hall');

INSERT INTO Carts (Id, Name, BatteryPercentage, CurrentBuildingCode) VALUES
  (1, 'Cart 1', 100, 'UP'),
  (2, 'Cart 2', 64,  'CS'),
  (3, 'Cart 3', 91,  'UP'),
  (4, 'Cart 4', 82,  NULL);

INSERT INTO Packages (Id, Barcode, LockerId, BuildingCode, LengthIn, WidthIn, HeightIn, WeightLb, Priority, Status, CartId, RouteIndex) VALUES
  (1, '1234-5678-9012', 'Locker Array 1', 'AH', 12, 10, 8,  8.5,  'Standard', 'CheckedIn',     NULL, 0),
  (2, '3141-5926-5358', 'Locker Array 1', 'FH', 4,  4,  4,  32.4, 'Urgent',   'EnRoute',       4,    3),
  (3, '7777-8888-9999', 'Locker Array 2', 'CS', 33, 33, 33, 6.1,  'Standard', 'Delivered',     2,    8),
  (4, '1111-2222-3333', 'Locker Array 2', 'CS', 3,  2,  1,  15.2, 'Urgent',   'AwaitingPickup', NULL, 0),
  (5, '3333-4444-5555', 'Locker Array 3', 'AH', 10, 10, 4,  4.7,  'Low',      'Loaded',        NULL, 0);

INSERT INTO PackageHistory (PackageId, Status, Timestamp, Location, Description) VALUES
  (1, 'CheckedIn',      UTC_TIMESTAMP(6) - INTERVAL 26 HOUR,   'Central Hub', 'Package checked in'),
  (2, 'CheckedIn',      UTC_TIMESTAMP(6) - INTERVAL 150 MINUTE, 'Central Hub', 'Package checked in'),
  (2, 'Loaded',         UTC_TIMESTAMP(6) - INTERVAL 40 MINUTE,  'Central Hub', 'Loaded onto Cart 4'),
  (2, 'EnRoute',        UTC_TIMESTAMP(6) - INTERVAL 12 MINUTE,  'Central Hub', 'Cart 4 left the hub'),
  (3, 'CheckedIn',      UTC_TIMESTAMP(6) - INTERVAL 30 HOUR,   'Central Hub', 'Package checked in'),
  (3, 'Loaded',         UTC_TIMESTAMP(6) - INTERVAL 26 HOUR,   'Central Hub', 'Loaded onto Cart 2'),
  (3, 'EnRoute',        UTC_TIMESTAMP(6) - INTERVAL 25 HOUR,   'Central Hub', 'Cart 2 left the hub'),
  (3, 'Delivered',      UTC_TIMESTAMP(6) - INTERVAL 24 HOUR,   'CS',           'Delivered to Locker Array 2'),
  (4, 'CheckedIn',      UTC_TIMESTAMP(6) - INTERVAL 70 MINUTE,  'Central Hub', 'Package checked in'),
  (4, 'AwaitingPickup', UTC_TIMESTAMP(6) - INTERVAL 65 MINUTE,  'Central Hub', 'Waiting for a courier'),
  (5, 'CheckedIn',      UTC_TIMESTAMP(6) - INTERVAL 200 MINUTE, 'Central Hub', 'Package checked in'),
  (5, 'Loaded',         UTC_TIMESTAMP(6) - INTERVAL 20 MINUTE,  'Central Hub', 'Loaded onto a cart');

INSERT INTO Preferences (UserId, NotifyEmail, NotifyText, Phone, PreferredWindow, FallbackPreference, SignatureOnFile)
VALUES (1, 1, 0, '', 'None', 'Hold', 0);
