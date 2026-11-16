// AJAX calls from the End-User (tracking) pages to the C# API (backend/CampusEco.Api).
// These replace the PackageStore and PrefsStore that kept this data in localStorage (public/Models.js).
//
// The API address can be changed with a .env file in the project root:
// VITE_API_URL=http://localhost:5080
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5080") + "/api";

// There is no end-user login yet, so every page acts as this one demo user.
export const USER_ID = 1;

// Signature receipts have no API endpoint yet, so they are kept in this browser, keyed by barcode.
const RECEIPTS_KEY = "campuseco.receipts";
// Written by C.Notifications.markAllRead() in public/Models.js.
const LAST_READ_KEY = "campuseco.notificationsLastRead";

// Turns an error response from the API into one readable sentence.
function errorMessage(body, status) {
  if (body && body.error) return body.error;
  // ASP.NET validation errors look like { errors: { Phone: ["..."] } }
  if (body && body.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (first) return first;
  }
  return "Something went wrong (error " + status + ").";
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(API_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error(
      "Can't reach the CampusEco API. Start it with \"dotnet run\" in backend/CampusEco.Api.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(errorMessage(body, response.status));
    error.status = response.status;
    throw error;
  }
  return body;
}

// ---------------------------------------------------------------------
// Receipts (browser only for now)
// ---------------------------------------------------------------------
function readReceipts() {
  try {
    return JSON.parse(localStorage.getItem(RECEIPTS_KEY)) || {};
  } catch {
    return {};
  }
}

function writeReceipts(receipts) {
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  } catch {
    // Storage can be blocked (private window); the receipt then lasts until the page reloads.
  }
}

// ---------------------------------------------------------------------
// API package -> the Package class from public/Models.js
// Keeping the class means the route, progress, and milestone getters the pages use still work.
// ---------------------------------------------------------------------
export function toPackage(dto) {
  const C = window.CampusEco;
  const receipt = readReceipts()[dto.barcode] || null;
  const history = (dto.history || []).map((h) => ({ status: h.status, at: h.at }));
  if (receipt) history.push({ status: "Receipt Signed", at: receipt.signedAt });

  const pkg = new C.Package({
    barcode: dto.barcode,
    building: dto.buildingCode,
    locker: dto.lockerId,
    lengthIn: dto.lengthIn,
    widthIn: dto.widthIn,
    heightIn: dto.heightIn,
    weightLb: dto.weightLb,
    priority: dto.priority,
    status: dto.status,
    history,
    routeIndex: dto.routeIndex,
    cart: { id: dto.cartName || "Cart", batteryPct: dto.cartBatteryPercentage },
    specialInstructions: dto.specialInstructions,
    receipt,
  });
  pkg.hasCart = dto.cartId != null;
  return pkg;
}

// ---------------------------------------------------------------------
// Preferences: API shape <-> the Preferences class from public/Models.js
// ---------------------------------------------------------------------
const WINDOW_TO_API = { "": "None", morning: "Morning", midday: "Midday", afternoon: "Afternoon" };

function toPreferences(dto) {
  const C = window.CampusEco;
  const win = String(dto.preferredWindow || "None").toLowerCase();
  return new C.Preferences({
    notifyEmail: dto.notifyEmail,
    notifyText: dto.notifyText,
    phone: dto.phone,
    window: win === "none" ? "" : win,
    building: dto.preferredBuildingCode || "",
    fallback: String(dto.fallbackPreference).toLowerCase() === "nearest" ? "nearest" : "hold",
    signatureOnFile: dto.signatureOnFile,
  });
}

function fromPreferences(prefs) {
  return {
    userId: USER_ID,
    notifyEmail: !!prefs.notifyEmail,
    notifyText: !!prefs.notifyText,
    phone: prefs.phone || "",
    preferredWindow: WINDOW_TO_API[prefs.window] || "None",
    preferredBuildingCode: prefs.building || null,
    fallbackPreference: prefs.fallback === "nearest" ? "Nearest" : "Hold",
    signatureOnFile: !!prefs.signatureOnFile,
  };
}

// ---------------------------------------------------------------------
// Notifications are built from each package's history, newest first.
// ---------------------------------------------------------------------
export function buildNotifications(packages, limit) {
  const C = window.CampusEco;
  const items = [];
  packages.forEach((pkg) => {
    pkg.history.forEach((event) => {
      items.push({ at: event.at, text: C.Notifications.message(pkg, event), barcode: pkg.barcode });
    });
  });
  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  return items.slice(0, limit);
}

export const trackingApi = {
  // Every package (there are no owners yet, so this is every package in the system).
  packages: async () => (await request("/packages")).map(toPackage),

  // One package by barcode, or null when the API says it does not exist.
  getPackage: async (barcode) => {
    try {
      return toPackage(await request("/packages/" + encodeURIComponent(barcode)));
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  },

  // Used by the demo controls on the detail page. The courier portal does the same thing for real deliveries.
  updateStatus: async (barcode, status, description) =>
    toPackage(
      await request("/packages/" + encodeURIComponent(barcode) + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status, location: "Demo controls", description }),
      }),
    ),

  // Saved preferences, or the defaults when this user has not saved any yet.
  getPreferences: async () => {
    try {
      return toPreferences(await request("/preferences/" + USER_ID));
    } catch (error) {
      if (error.status === 404) return new window.CampusEco.Preferences();
      throw error;
    }
  },

  savePreferences: async (prefs) =>
    toPreferences(
      await request("/preferences/" + USER_ID, { method: "PUT", body: JSON.stringify(fromPreferences(prefs)) }),
    ),

  saveReceipt: (barcode, receipt) => {
    const receipts = readReceipts();
    receipts[barcode] = receipt;
    writeReceipts(receipts);
  },

  // Forgets the receipts and the "mark all read" time saved in this browser.
  clearBrowserData: () => {
    try {
      localStorage.removeItem(RECEIPTS_KEY);
      localStorage.removeItem(LAST_READ_KEY);
    } catch {
      // nothing to clear
    }
  },
};
