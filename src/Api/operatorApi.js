
// AJAX calls from the Operator pages to the C# API.
// Mirrors courierApi.js.

const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5080") + "/api";

const SESSION_KEY = "campuseco.operatorId";

function errorMessage(body, status) {
  if (body && body.error) return body.error;

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
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      'Can\'t reach the CampusEco API. Start it with "dotnet run" in backend/CampusEco.Api.',
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
  return request(path, {
    method,
    body: JSON.stringify(data),
  });
}

export const operatorApi = {
  register: (data) => send("POST", "/operators", data),

  signIn: (email, password) =>
    send("POST", "/operators/signin", { email, password }),

  getOperator: (id) => request("/operators/" + id),
};

export function getSignedInOperatorId() {
  try {
    const id = Number(window.localStorage.getItem(SESSION_KEY));
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setSignedInOperatorId(id) {
  try {
    window.localStorage.setItem(SESSION_KEY, String(id));
  } catch {
    // Private browsing: operator must sign in again next time.
  }
}

export function clearSignedInOperatorId() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

export async function loadSignedInOperator() {
  const id = getSignedInOperatorId();

  if (!id) return null;

  try {
    return await operatorApi.getOperator(id);
  } catch (err) {
    if (err.status === 404) {
      clearSignedInOperatorId();
      return null;
    }

    throw err;
  }
}
