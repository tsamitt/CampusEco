-- Run ONCE per computer, as the MySQL root user:
--   mysql -u root -p < db/00_create_database_and_user.sql
-- Creates the shared database name and a local development login that the API uses.
-- The password below is for a LOCAL throwaway database only. Never reuse it anywhere real.
CREATE DATABASE IF NOT EXISTS campuseco CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'campuseco'@'localhost' IDENTIFIED BY 'campuseco_dev';
GRANT ALL PRIVILEGES ON campuseco.* TO 'campuseco'@'localhost';
FLUSH PRIVILEGES;
