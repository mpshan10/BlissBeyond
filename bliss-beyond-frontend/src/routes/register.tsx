import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useBliss();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <section className="section auth-section">
      <div className="container">
        <div className="auth-panel">
          <div className="auth-copy">
            <span className="eyebrow">Create account</span>
            <h1 className="mt-2 mb-3">Register to save your booking draft.</h1>
            <p className="text-ink-soft">
              New customer accounts share the same booking flow, profile, and availability logic as
              the demo account.
            </p>
          </div>
          <div className="panel">
            <div className="panel__head">
              <h5 className="mb-0">Register</h5>
              <Link className="btn btn-outline-forest btn-sm" to="/login">
                Login
              </Link>
            </div>
            <div className="panel__body">
              <div className="field-row">
                <label className="field">
                  <span className="form-label">First name</span>
                  <input
                    className="form-control"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="form-label">Last name</span>
                  <input
                    className="form-control"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </label>
              </div>
              <label className="field mb-3">
                <span className="form-label">Email</span>
                <input
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="field mb-3">
                <span className="form-label">Phone</span>
                <input
                  className="form-control"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <label className="field mb-3">
                <span className="form-label">Password</span>
                <input
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? <div className="form-error">{error}</div> : null}
              <button
                className="btn btn-gold w-100"
                type="button"
                onClick={() => {
                  const result = register({ firstName, lastName, email, phone, password });
                  if (result.ok) {
                    navigate({ to: "/packages" });
                  } else {
                    setError(result.message);
                  }
                }}
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
