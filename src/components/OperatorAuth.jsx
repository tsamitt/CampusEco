
import React, { useState } from "react";
import { operatorApi, setSignedInOperatorId } from "../Api/operatorApi.js";
import "../css/operator.css";

const STRENGTH = [
  { label: "Too short", color: "#d33" },
  { label: "Weak", color: "#d33" },
  { label: "Fair", color: "#e0a100" },
  { label: "Good", color: "#e0a100" },
  { label: "Strong", color: "#2e9e45" },
  { label: "Very strong", color: "#2e9e45" },
];

function isMnsuEmail(email) {
  return /^[^\s@]+@mnsu\.edu$/i.test(String(email));
}

function scorePassword(pw) {
  let score = 0;

  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  return score;
}

export default function OperatorAuth({ onAuthenticated }) {
  const [mode, setMode] = useState("signin");

  // Registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const trimmedEmail = email.trim();
  const emailOk =
    trimmedEmail === "" || isMnsuEmail(trimmedEmail);

  const score = scorePassword(password);

  const strengthText =
    password.length < 8
      ? "At least 8 characters"
      : STRENGTH[score].label;

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setSignInPassword("");
  }

  async function completeAuthentication(operator) {
    setSignedInOperatorId(operator.id);
    setPassword("");
    setSignInPassword("");

    if (onAuthenticated) {
      onAuthenticated(operator);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isMnsuEmail(trimmedEmail)) {
      setError("Please use your @mnsu.edu email address.");
      return;
    }

    setSaving(true);

    try {
      const operator = await operatorApi.register({
        name: name.trim(),
        email: trimmedEmail.toLowerCase(),
        password,
      });

      await completeAuthentication(operator);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const operator = await operatorApi.signIn(
        signInEmail.trim().toLowerCase(),
        signInPassword,
      );

      await completeAuthentication(operator);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <section className="operator-auth">
        <h2>Operator Portal</h2>

        <p>
          {mode === "signin"
            ? "Sign in to manage CampusEco package deliveries."
            : "Create an operator account to access the CampusEco dashboard."}
        </p>

        <div className="operator-auth-tabs">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}
            disabled={saving}
          >
            Sign In
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => switchMode("register")}
            disabled={saving}
          >
            Register
          </button>
        </div>

        {mode === "register" ? (
          <form onSubmit={handleRegister}>
            <h3>Create Operator Account</h3>

            <label htmlFor="operator-name">Full Name *</label>
            <input
              id="operator-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="operator-email">Email Address *</label>
            <input
              id="operator-email"
              type="email"
              placeholder="name@mnsu.edu"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <span className={"field-hint" + (emailOk ? "" : " is-error-text")}>
              {emailOk
                ? "Use your @mnsu.edu address"
                : "Must end in @mnsu.edu"}
            </span>

            <label htmlFor="operator-password">Password *</label>
            <input
              id="operator-password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              maxLength={100}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>

            <div className="strength-meter">
              <div
                className="strength-fill"
                style={{
                  width: (password ? (score / 5) * 100 : 0) + "%",
                  backgroundColor: STRENGTH[score].color,
                }}
              />
            </div>

            <span className="field-hint">{strengthText}</span>

            <button type="submit" disabled={saving}>
              {saving ? "Registering..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn}>
            <h3>Operator Sign In</h3>

            <label htmlFor="operator-signin-email">
              Email Address *
            </label>
            <input
              id="operator-signin-email"
              type="email"
              autoComplete="username"
              required
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
            />

            <label htmlFor="operator-signin-password">
              Password *
            </label>
            <input
              id="operator-signin-password"
              type="password"
              autoComplete="current-password"
              required
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
            />

            <button type="submit" disabled={saving}>
              {saving ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {error && (
          <div className="form-message is-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="form-message is-success" role="status">
            {success}
          </div>
        )}
      </section>
    </main>
  );
}
