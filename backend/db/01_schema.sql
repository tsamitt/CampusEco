-- CampusEco schema. Safe to re-run: it drops and recreates every table (this resets all data).
--   mysql -u campuseco -pcampuseco_dev campuseco < db/01_schema.sql
-- Table and column names match the C# model property names exactly, so Entity Framework
-- maps them without any extra configuration. Enum columns hold the C# enum NAME (for example EnRoute).
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS PackageHistory;
DROP TABLE IF EXISTS Packages;
DROP TABLE IF EXISTS Preferences;
DROP TABLE IF EXISTS Carts;
DROP TABLE IF EXISTS Buildings;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Buildings (
  Code CHAR(2)      NOT NULL,
  Name VARCHAR(80)  NOT NULL,
  PRIMARY KEY (Code)
) ENGINE=InnoDB;

CREATE TABLE Carts (
  Id                  INT         NOT NULL AUTO_INCREMENT,
  Name                VARCHAR(40) NOT NULL,
  BatteryPercentage   DOUBLE      NOT NULL DEFAULT 100,
  CurrentBuildingCode CHAR(2)     NULL,
  PRIMARY KEY (Id),
  UNIQUE KEY UX_Carts_Name (Name),
  CONSTRAINT FK_Carts_Building FOREIGN KEY (CurrentBuildingCode) REFERENCES Buildings (Code),
  CONSTRAINT CK_Carts_Battery CHECK (BatteryPercentage BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE Packages (
  Id                  INT          NOT NULL AUTO_INCREMENT,
  Barcode             VARCHAR(14)  NOT NULL,
  LockerId            VARCHAR(40)  NOT NULL,
  BuildingCode        CHAR(2)      NOT NULL,
  LengthIn            DOUBLE       NOT NULL DEFAULT 0,
  WidthIn             DOUBLE       NOT NULL DEFAULT 0,
  HeightIn            DOUBLE       NOT NULL DEFAULT 0,
  WeightLb            DOUBLE       NOT NULL DEFAULT 0,
  Priority            VARCHAR(10)  NOT NULL DEFAULT 'Standard',
  Status              VARCHAR(20)  NOT NULL DEFAULT 'CheckedIn',
  CartId              INT          NULL,
  RouteIndex          INT          NOT NULL DEFAULT 0,
  SpecialInstructions VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (Id),
  UNIQUE KEY UX_Packages_Barcode (Barcode),
  KEY IX_Packages_Status (Status),
  KEY IX_Packages_BuildingCode (BuildingCode),
  CONSTRAINT FK_Packages_Building FOREIGN KEY (BuildingCode) REFERENCES Buildings (Code),
  CONSTRAINT FK_Packages_Cart FOREIGN KEY (CartId) REFERENCES Carts (Id) ON DELETE SET NULL,
  CONSTRAINT CK_Packages_Priority CHECK (Priority IN ('Low','Standard','Urgent')),
  CONSTRAINT CK_Packages_Status CHECK (Status IN ('CheckedIn','AwaitingPickup','Loaded','EnRoute','Delivered','Cancelled'))
) ENGINE=InnoDB;

CREATE TABLE PackageHistory (
  Id          INT          NOT NULL AUTO_INCREMENT,
  PackageId   INT          NOT NULL,
  Status      VARCHAR(20)  NOT NULL,
  Timestamp   DATETIME(6)  NOT NULL,   -- stored in UTC
  Location    VARCHAR(120) NULL,
  Description VARCHAR(300) NULL,
  PRIMARY KEY (Id),
  KEY IX_PackageHistory_Package (PackageId, Timestamp),
  CONSTRAINT FK_PackageHistory_Package FOREIGN KEY (PackageId) REFERENCES Packages (Id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Preferences (
  Id                    INT         NOT NULL AUTO_INCREMENT,
  UserId                INT         NOT NULL,
  NotifyEmail           TINYINT(1)  NOT NULL DEFAULT 1,
  NotifyText            TINYINT(1)  NOT NULL DEFAULT 0,
  Phone                 VARCHAR(20) NOT NULL DEFAULT '',
  PreferredWindow       VARCHAR(10) NOT NULL DEFAULT 'None',
  PreferredBuildingCode CHAR(2)     NULL,
  FallbackPreference    VARCHAR(10) NOT NULL DEFAULT 'Hold',
  SignatureOnFile       TINYINT(1)  NOT NULL DEFAULT 0,
  PRIMARY KEY (Id),
  UNIQUE KEY UX_Preferences_User (UserId),
  CONSTRAINT FK_Preferences_Building FOREIGN KEY (PreferredBuildingCode) REFERENCES Buildings (Code),
  CONSTRAINT CK_Preferences_Window CHECK (PreferredWindow IN ('None','Morning','Midday','Afternoon')),
  CONSTRAINT CK_Preferences_Fallback CHECK (FallbackPreference IN ('Hold','Nearest'))
) ENGINE=InnoDB;
