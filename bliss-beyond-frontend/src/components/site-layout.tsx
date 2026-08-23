import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useBliss } from "../lib/bliss-data";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/packages", label: "Packages" },
  { to: "/venues", label: "Venues" },
  { to: "/catering", label: "Catering" },
  { to: "/booking", label: "Review" },
  { to: "/profile", label: "Profile" },
  { to: "/admin", label: "Admin" },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { currentUser } = useBliss();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="bb-page">
      <header className="bb-nav sticky-top">
        <div className="container bb-nav__inner">
          <Link className="navbar-brand me-4" to="/">
            Bliss & Beyond<small>Events & Catering</small>
          </Link>
          <button
            className="bb-nav__toggle"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`bb-nav__menu ${open ? "open" : ""}`}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="nav-link"
                activeProps={{ className: "nav-link active" }}
                activeOptions={link.to === "/" ? { exact: true } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={`bb-nav__actions ${open ? "open" : ""}`}>
            {currentUser ? (
              <Link className="btn btn-outline-forest btn-sm" to="/profile">
                {currentUser.firstName}
              </Link>
            ) : (
              <>
                <Link className="btn btn-outline-forest btn-sm" to="/login">
                  Login
                </Link>
                <Link className="btn btn-gold btn-sm" to="/register">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bb-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <Link className="navbar-brand d-block h4 mb-2" to="/">
                Bliss & Beyond
              </Link>
              <p className="small mb-3">
                AI-powered event planning and catering management for weddings, celebrations and
                corporate gatherings.
              </p>
              <div className="d-flex gap-3 fs-5">
                <a href="https://instagram.com" target="_blank" rel="noreferrer">
                  Instagram
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </div>
            </div>
            <div className="col-6 col-lg-2">
              <h5 className="h6 mb-3">Explore</h5>
              <ul className="list-unstyled d-grid gap-2">
                <li>
                  <Link to="/packages">Packages</Link>
                </li>
                <li>
                  <Link to="/venues">Venues</Link>
                </li>
                <li>
                  <Link to="/catering">Catering</Link>
                </li>
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
              </ul>
            </div>
            <div className="col-6 col-lg-2">
              <h5 className="h6 mb-3">Account</h5>
              <ul className="list-unstyled d-grid gap-2">
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/register">Register</Link>
                </li>
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              </ul>
            </div>
            <div className="col-lg-4">
              <h5 className="h6 mb-3">Stay in touch</h5>
              <p className="small mb-2">
                18 Rosewood Avenue, Colombo 05 · +94 11 234 5678 · hello@blissandbeyond.com
              </p>
              <div className="small text-white-50">Current route: {pathname}</div>
            </div>
          </div>
          <div className="foot-bottom d-flex flex-wrap justify-content-between gap-2">
            <span>© 2026 Bliss & Beyond.</span>
            <span>Privacy Policy · Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
