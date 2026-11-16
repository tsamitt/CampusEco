# CampusEco Node.js Service

## Description
This Node.js service simulates electric delivery cart activity for the CampusEco project. It runs separately from the C# backend and does not connect to the database.

## Features
- Simulates cart locations and battery levels every 5 seconds.
- Generates dispatch alerts when cart batteries reach 20%.
- Parses delivery routes with multiple stops.
- Handles HTTP requests and returns JSON responses.

## How to Run
1. Install Node.js.
2. Open the `backend/node-service` folder in a terminal.
3. Run:
   `node server.cjs`
4. The server starts at `http://localhost:3001`.

## API Endpoints
- `GET /api/telemetry` — View cart locations and battery levels.
- `GET /api/alerts` — View low-battery dispatch alerts.
- `POST /api/routes/parse` — Parse a list of delivery stops.

## Testing
All three endpoints were tested successfully using Firefox and the VS Code terminal.