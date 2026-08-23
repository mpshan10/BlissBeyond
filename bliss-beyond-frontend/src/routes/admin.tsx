import { Link, createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { CalendarRange, Building2, ListChecks, Users, UtensilsCrossed } from "lucide-react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/admin")({
  component: AdminHomePage,
});

function AdminHomePage() {
  const { currentUser } = useBliss();

  if (currentUser?.role !== "admin") {
    return (
      <section className="section">
        <div className="container">
          <div className="panel">
            <div className="panel__body text-center">
              <h1 className="mb-2">Admin access required</h1>
              <p className="text-ink-soft mb-4">
                Sign in with the admin demo account to manage packages, venues, bookings and
                customers.
              </p>
              <Link className="btn btn-gold" to="/login">
                Sign in as admin
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Admin panel</span>
            <h1 className="mt-2 mb-2">Manage the same catalog and booking data.</h1>
            <p className="mb-0 page-subcopy">
              Use the sections below to update packages, venues, bookings, customers and services.
            </p>
          </div>
        </div>

        <div className="package-grid">
          <AdminCard
            icon={CalendarRange}
            title="Bookings"
            text="Update booking statuses, view details and manage customer requests."
            to="/admin/bookings"
          />
          <AdminCard
            icon={Building2}
            title="Packages"
            text="Add, edit and remove packages and their venue matches."
            to="/admin/packages"
          />
          <AdminCard
            icon={ListChecks}
            title="Venues"
            text="Maintain venue listings, capacity and package associations."
            to="/admin/venues"
          />
          <AdminCard
            icon={Users}
            title="Customers"
            text="Review customers and their booking history."
            to="/admin/customers"
          />
          <AdminCard
            icon={UtensilsCrossed}
            title="Services"
            text="Manage catering and other event services."
            to="/admin/services"
          />
        </div>
      </div>
    </section>
  );
}

function AdminCard({
  icon: Icon,
  title,
  text,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  to: string;
}) {
  return (
    <article className="bb-card">
      <div className="bb-card__body">
        <span className="feature-icon mb-3">
          <Icon />
        </span>
        <h4>{title}</h4>
        <p className="small text-ink-soft">{text}</p>
        <Link className="btn btn-outline-forest btn-sm" to={to}>
          Open
        </Link>
      </div>
    </article>
  );
}
