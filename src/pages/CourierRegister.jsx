import { useRef, useState } from "react";
import "../css/courier.css";
import { clearSignedInId, courierApi, loadSignedInCourier, setSignedInId } from "../Api/courierApi.js";
import { ApiError, useApiData } from "./CourierShared.jsx";

// Password strength labels and colors, from score 0 to 5.
const STRENGTH = [
  { label: "Too short", color: "#d33" },
  { label: "Weak", color: "#d33" },
  { label: "Fair", color: "#e0a100" },
  { label: "Good", color: "#e0a100" },
  { label: "Strong", color: "#2e9e45" },
  { label: "Very strong", color: "#2e9e45" },
];

// How much each kind of courier can carry (the API checks this again when claiming).
const ROLES = {
  Driver: { label: "Delivery Driver", maxLoadLb: 150 },
  Walker: { label: "Walking Courier", maxLoadLb: 25 },
};

function isMnsuEmail(email) {
  return /^[^\s@]+@mnsu\.edu$/i.test(String(email));
}

// Scores a password from 0 to 5.
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

// Courier account registration and sign in (formerly courierRegister.html + courierRegister.js).
export default function CourierRegister() {
  const C = window.CampusEco;
  const signedIn = useApiData(loadSignedInCourier);
  const courier = signedIn.data;

  // Registration form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shift, setShift] = useState("");
  const [role, setRole] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [saving, setSaving] = useState(false);
  const emailRef = useRef(null);

  // After a successful registration the form is swapped for a success message.
  const [successText, setSuccessText] = useState("");

  // Sign in form fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");

  // Email: custom rule on top of type="email" (must be an @mnsu.edu address)
  const trimmedEmail = email.trim();
  const emailOk = trimmedEmail === "" || isMnsuEmail(trimmedEmail);

  function changeEmail(event) {
    const value = event.target.value;
    const ok = value.trim() === "" || isMnsuEmail(value.trim());
    event.target.setCustomValidity(ok ? "" : "Please use your @mnsu.edu email address.");
    setEmail(value);
  }

  // Password strength meter
  const score = scorePassword(password);
  const strengthText = password.length < 8 ? "At least 8 characters" : STRENGTH[score].label;

  // Role hint: how much this kind of courier can carry
  const roleHint = role ? ROLES[role].label + "s can carry up to " + ROLES[role].maxLoadLb + " lb per load." : "";

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setShift("");
    setRole("");
    setRegisterError("");
    if (emailRef.current) emailRef.current.setCustomValidity("");
  }

  // Submit: create the courier account in the database
  async function handleSubmit(event) {
    event.preventDefault(); // stay on the page. The browser already checked the required fields.
    setRegisterError("");
    setSaving(true);

    let newCourier;
    try {
      newCourier = await courierApi.register({
        name: name.trim(),
        email: trimmedEmail.toLowerCase(),
        password,
        shift,
        role,
      });
    } catch (err) {
      setSaving(false);
      setRegisterError(err.message);
      return;
    }

    setSaving(false);
    setSignedInId(newCourier.id);
    setSuccessText(
      "Welcome, " + newCourier.name.split(" ")[0] + "! You're registered as a " + newCourier.roleLabel +
        " on the " + newCourier.shift.toLowerCase() + " shift.",
    );
    setPassword(""); // don't keep the password in memory
    signedIn.reload();
  }

  // Sign in to an account that already exists
  async function handleSignIn(event) {
    event.preventDefault();
    setSignInError("");
    setSaving(true);

    let found;
    try {
      found = await courierApi.signIn(signInEmail.trim(), signInPassword);
    } catch (err) {
      setSaving(false);
      setSignInError(err.message);
      return;
    }

    setSaving(false);
    setSignedInId(found.id);
    setSignInEmail("");
    setSignInPassword("");
    signedIn.reload();
  }

  // Sign out
  function signOut() {
    clearSignedInId();
    resetForm();
    setSuccessText("");
    signedIn.reload();
  }

  return (
    <main>
      <section>
        <h2>Courier Registration</h2>

        <a href="courier.html">Back to Courier Dashboard</a>

        <ApiError message={signedIn.error} onRetry={signedIn.reload} />

        {/* Shown when a courier is signed in on this device */}
        <div id="current-courier" className="form-message is-success slide-in" hidden={!courier}>
          <span id="current-courier-text">
            {courier ? "Signed in as " + courier.name + " (" + courier.email + "). " : ""}
          </span>
          <button type="button" id="sign-out" onClick={signOut}>
            Sign out
          </button>
        </div>

        <section id="register-section" hidden={successText !== ""}>
          <h3>Create a Courier Account</h3>

          <form id="register-form" onSubmit={handleSubmit}>
            <p>* Required field</p>

            <label htmlFor="reg-name">Full Name *</label>
            <input
              type="text"
              id="reg-name"
              name="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="reg-email">Email Address *</label>
            <input
              type="email"
              id="reg-email"
              name="reg-email"
              placeholder="name@mnsu.edu"
              required
              ref={emailRef}
              value={email}
              onChange={changeEmail}
            />
            <span id="email-hint" className={"field-hint" + (emailOk ? "" : " is-error-text")}>
              {emailOk ? "Use your @mnsu.edu address" : "Must end in @mnsu.edu"}
            </span>

            <label htmlFor="reg-password">Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              id="reg-password"
              name="reg-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" id="toggle-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
            <div className="strength-meter">
              <div
                id="strength-fill"
                className="strength-fill"
                style={{
                  width: (password ? (score / 5) * 100 : 0) + "%",
                  backgroundColor: STRENGTH[score].color,
                  transition: "width " + C.animationMs(200) + "ms ease",
                }}
              ></div>
            </div>
            <span id="strength-text" className="field-hint">
              {strengthText}
            </span>

            <label htmlFor="reg-shift">Preferred Shift *</label>
            <select id="reg-shift" name="reg-shift" required value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="">Select a shift</option>
              <option value="Morning">Morning</option>
              <option value="Midday">Midday</option>
              <option value="Afternoon">Afternoon</option>
            </select>

            <fieldset>
              <legend>Role *</legend>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="Driver"
                  required
                  checked={role === "Driver"}
                  onChange={(e) => setRole(e.target.value)}
                />{" "}
                Delivery Driver
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="Walker"
                  checked={role === "Walker"}
                  onChange={(e) => setRole(e.target.value)}
                />{" "}
                Walking Courier
              </label>
            </fieldset>
            <span id="role-hint" className="field-hint">
              {roleHint}
            </span>

            <button type="submit" disabled={saving}>
              Register
            </button>

            <div className="form-message is-error" role="alert" hidden={!registerError}>
              {registerError}
            </div>
          </form>
        </section>

        {/* Shown after a successful registration */}
        <section id="register-success" className="form-message is-success slide-in" hidden={successText === ""}>
          <p id="register-success-text">{successText}</p>
          <a href="courier.html">Go to Courier Dashboard</a>
        </section>

        {/* Sign in with an account that already exists (hidden while signed in) */}
        <section id="signin-section" hidden={!!courier}>
          <h3>Already Registered? Sign In</h3>

          <form id="signin-form" onSubmit={handleSignIn}>
            <label htmlFor="signin-email">Email Address *</label>
            <input
              type="email"
              id="signin-email"
              name="signin-email"
              placeholder="name@mnsu.edu"
              autoComplete="username"
              required
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
            />

            <label htmlFor="signin-password">Password *</label>
            <input
              type="password"
              id="signin-password"
              name="signin-password"
              autoComplete="current-password"
              required
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
            />

            <button type="submit" disabled={saving}>
              Sign In
            </button>

            <div className="form-message is-error" role="alert" hidden={!signInError}>
              {signInError}
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}