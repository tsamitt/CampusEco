
const http = require("node:http");

const PORT = 3001;
const carts = [
  { id: 1, building: "AH", battery: 85, latitude: 44.1636, longitude: -93.9994 },
  { id: 2, building: "CS", battery: 45, latitude: 44.1618, longitude: -93.9978 },
  { id: 3, building: "FH", battery: 18, latitude: 44.1605, longitude: -94.0012 }
];

const alerts = [];

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

function updateTelemetry() {
  for (const cart of carts) {
    cart.latitude += (Math.random() - 0.5) * 0.0002;
    cart.longitude += (Math.random() - 0.5) * 0.0002;
    cart.battery = Math.max(0, cart.battery - 1);

    if (cart.battery === 20) {
      const alert = {
        cartId: cart.id,
        message: "Low battery - dispatch assistance needed",
        battery: cart.battery,
        timestamp: new Date().toISOString()
      };
      alerts.push(alert);
      console.log("DISPATCH ALERT:", alert);
    }
  }
}

// Background telemetry and battery monitoring
setInterval(updateTelemetry, 5000);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  const path = new URL(req.url, "http://localhost").pathname;

  if (req.method === "GET" && path === "/api/telemetry") {
    return sendJSON(res, 200, {
      timestamp: new Date().toISOString(),
      carts
    });
  }

  if (req.method === "GET" && path === "/api/alerts") {
    return sendJSON(res, 200, alerts);
  }

  if (req.method === "POST" && path === "/api/routes/parse") {
    let body = "";

    try {
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) {
          return sendJSON(res, 413, { error: "Request too large" });
        }
      }

      const data = JSON.parse(body);

      if (!Array.isArray(data.stops) ||
          !data.stops.every(stop => typeof stop === "string")) {
        return sendJSON(res, 400, {
          error: "Provide a stops array of building names"
        });
      }

      return sendJSON(res, 200, {
        totalStops: data.stops.length,
        route: data.stops.map((building, index) => ({
          order: index + 1,
          building
        }))
      });
    } catch {
      return sendJSON(res, 400, { error: "Invalid JSON" });
    }
  }

  sendJSON(res, 404, { error: "Endpoint not found" });
});

server.listen(PORT, () => {
  console.log(`CampusEco Node.js running at http://localhost:${PORT}`);
});
