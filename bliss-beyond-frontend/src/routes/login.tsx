import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useBliss();
  const [email, setEmail] = useState("maya@bliss.test");
  const [password, setPassword] = useState("bliss123");
  const [error, setError] = useState("");

  return (
    <section className="section auth-section">
      <div className="container">
        <div className="auth-panel">
          <div className="auth-copy">
            <span className="eyebrow">Welcome back</span>
            <h1 className="mt-2 mb-3">Sign in to continue your booking.</h1>
            <p className="text-ink-soft">
              Use the demo account to test the customer flow or sign in as an admin to manage
              packages and bookings.
            </p>
            <div className="note-box">
              <strong>Demo customer</strong>
              <div>maya@bliss.test</div>
              <div>Password: bliss123</div>
            </div>
            <div className="note-box mt-3">
              <strong>Demo admin</strong>
              <div>admin@bliss.test</div>
              <div>Password: blissadmin</div>
            </div>
          </div>
          <div className="panel">
            <div className="panel__head">
              <h5 className="mb-0">Login</h5>
              <Link className="btn btn-outline-forest btn-sm" to="/register">
                Register
              </Link>
            </div>
            <div className="panel__body">
              <label className="field mb-3">
                <span className="form-label">Email</span>
                <input
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  const result = login({ email, password });
                  if (result.ok) {
                    navigate({ to: "/profile" });
                  } else {
                    setError(result.message);
                  }
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
