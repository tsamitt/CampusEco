// AJAX calls from the Courier pages to the C# API (backend/CampusEco.Api).
// These replace the old courierModels.js stores that kept courier data in localStorage.
//
// The API address can be changed with a .env file in the project root:
// VITE_API_URL=http://localhost:5080
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5080") + "/api";

// Turns an error response from the API into one readable sentence.
function errorMessage(body, status) {
  if (body && body.error) return body.error;
  // ASP.NET validation errors look like { errors: { Email: ["..."] } }
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

function send(method, path, data) {
  return request(path, { method, body: JSON.stringify(data) });
}

export const courierApi = {
  // Courier accounts
  register: (data) => send("POST", "/couriers", data),
  signIn: (email, password) => send("POST", "/couriers/signin", { email, password }),
  getCourier: (id) => request("/couriers/" + id),

  // Route queue and the signed-in courier's deliveries
  queue: () => request("/courier/queue"),
  deliveries: (courierId) => request("/couriers/" + courierId + "/deliveries"),
  claim: (courierId, barcode, cartId, verifiedWeightLb) =>
    send("POST", "/couriers/" + courierId + "/claims", { barcode, cartId, verifiedWeightLb }),
  updateStatus: (courierId, barcode, status, notes) =>
    send("PATCH", "/couriers/" + courierId + "/deliveries/" + barcode + "/status", { status, notes }),

  // Any package by barcode (used to explain why a barcode can't be claimed or updated)
  getPackage: (barcode) => request("/packages/" + encodeURIComponent(barcode)),

  // Cart fleet and battery reports
  carts: () => request("/courier/carts"),
  reportBattery: (cartId, report) =>
    send("POST", "/courier/carts/" + cartId + "/battery-reports", report),
};

// Signed-in courier. Only the courier's id is remembered in this browser (like a
// login session); the courier's details always come from the database.
const SESSION_KEY = "campuseco.courierId";

export function getSignedInId() {
  try {
    const id = Number(window.localStorage.getItem(SESSION_KEY));
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setSignedInId(id) {
  try {
    window.localStorage.setItem(SESSION_KEY, String(id));
  } catch {
    // Private browsing: the courier just has to sign in again next time.
  }
}

export function clearSignedInId() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing to clear
  }
}

// Loads the signed-in courier from the API, or null if nobody is signed in.
export async function loadSignedInCourier() {
  const id = getSignedInId();
  if (!id) return null;
  try {
    return await courierApi.getCourier(id);
  } catch (err) {
    // The account no longer exists (for example the database was reset), so sign out.
    if (err.status === 404) {
      clearSignedInId();
      return null;
    }
    throw err;
  }
}