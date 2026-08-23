import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookingsPage,
});

function AdminBookingsPage() {
  const { currentUser, bookings, packages, venues, users, updateBookingStatus } = useBliss();

  if (currentUser?.role !== "admin") return <Gate />;

  return (
    <AdminShell title="Bookings" backTo="/admin">
      <div className="panel">
        <div className="panel__body">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Venue</th>
                  <th>Date & time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const customer = users.find((user) => user.id === booking.customerId);
                  return (
                    <tr key={booking.id}>
                      <td>{booking.id.slice(-6)}</td>
                      <td>{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown"}</td>
                      <td>{packages.find((item) => item.id === booking.packageId)?.name ?? "-"}</td>
                      <td>{venues.find((item) => item.id === booking.venueId)?.name ?? "-"}</td>
                      <td>
                        {booking.bookingDate} {booking.bookingTime}
                      </td>
                      <td>
                        <span className={`status ${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
                          <button
                            className="btn btn-outline-forest btn-sm"
                            type="button"
                            onClick={() => updateBookingStatus(booking.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline-forest btn-sm"
                            type="button"
                            onClick={() => updateBookingStatus(booking.id, "Rejected")}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-gold btn-sm"
                            type="button"
                            onClick={() => updateBookingStatus(booking.id, "Confirmed")}
                          >
                            Confirm
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function AdminShell({
  title,
  backTo,
  children,
}: {
  title: string;
  backTo: string;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container d-flex justify-content-between align-items-end flex-wrap gap-3">
            <div>
              <span className="eyebrow">Admin</span>
              <h1 className="mt-2 mb-2">{title}</h1>
            </div>
            <Link className="btn btn-outline-light-gold" to={backTo}>
              Back to admin
            </Link>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function Gate() {
  return (
    <section className="section">
      <div className="container">
        <div className="panel">
          <div className="panel__body text-center">
            <h2 className="mb-2">Admin access required</h2>
            <Link className="btn btn-gold" to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
