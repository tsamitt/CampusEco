import { useRef, useState } from "react";
import "../css/courier.css";
const { CourierStore, EcoCourier } = window.CampusEcoCourier;

// Password strength labels and colors, from score 0 to 5.
const STRENGTH = [
  { label: "Too short", color: "#d33" },
  { label: "Weak", color: "#d33" },
  { label: "Fair", color: "#e0a100" },
  { label: "Good", color: "#e0a100" },
  { label: "Strong", color: "#2e9e45" },
  { label: "Very strong", color: "#2e9e45" },
];

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

// Courier account registration (formerly courierRegister.html + courierRegister.js).
export default function CourierRegister() {
  const C = window.CampusEco;
  const [courier, setCourier] = useState(() => CourierStore.loadCourier());

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shift, setShift] = useState("");
  const [role, setRole] = useState("");
  const emailRef = useRef(null);

  // After a successful registration the form is swapped for a success message.
  const [successText, setSuccessText] = useState("");

  // Email: custom rule on top of type="email" (must be an @mnsu.edu address)
  const trimmedEmail = email.trim();
  const emailOk = trimmedEmail === "" || EcoCourier.isMnsuEmail(trimmedEmail);

  function changeEmail(event) {
    const value = event.target.value;
    const ok = value.trim() === "" || EcoCourier.isMnsuEmail(value.trim());
    event.target.setCustomValidity(ok ? "" : "Please use your @mnsu.edu email address.");
    setEmail(value);
  }

  // Password strength meter
  const score = scorePassword(password);
  const strengthText = password.length < 8 ? "At least 8 characters" : STRENGTH[score].label;

  // Role hint: how much this kind of courier can carry
  let roleHint = "";
  if (role) {
    const sample = new EcoCourier({ role });
    roleHint = sample.roleLabel + "s can carry up to " + sample.maxLoadLb + " lb per load.";
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setShift("");
    setRole("");
    if (emailRef.current) emailRef.current.setCustomValidity("");
  }

  // Submit: create and save the EcoCourier
  function handleSubmit(event) {
    event.preventDefault(); // stay on the page. The browser already checked the required fields.

    const newCourier = new EcoCourier({
      name: name.trim(),
      email: trimmedEmail.toLowerCase(),
      shift,
      role,
    });
    CourierStore.saveCourier(newCourier);

    setSuccessText(
      "Welcome, " + newCourier.firstName + "! You're registered as a " + newCourier.roleLabel +
        " on the " + newCourier.shift + " shift.",
    );
    setCourier(CourierStore.loadCourier());
  }

  // Sign out
  function signOut() {
    CourierStore.clearCourier();
    resetForm();
    setSuccessText("");
    setCourier(null);
  }

  return (
    <main>
      <section>
        <h2>Courier Registration</h2>

        <a href="courier.html">Back to Courier Dashboard</a>

        {/* Shown when a courier is already registered on this device */}
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
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
            </select>

            <fieldset>
              <legend>Role *</legend>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  required
                  checked={role === "driver"}
                  onChange={(e) => setRole(e.target.value)}
                />{" "}
                Delivery Driver
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="walker"
                  checked={role === "walker"}
                  onChange={(e) => setRole(e.target.value)}
                />{" "}
                Walking Courier
              </label>
            </fieldset>
            <span id="role-hint" className="field-hint">
              {roleHint}
            </span>

            <button type="submit">Register</button>
          </form>
        </section>

        {/* Shown after a successful registration */}
        <section id="register-success" className="form-message is-success slide-in" hidden={successText === ""}>
          <p id="register-success-text">{successText}</p>
          <a href="courier.html">Go to Courier Dashboard</a>
        </section>
      </section>
    </main>
  );
}