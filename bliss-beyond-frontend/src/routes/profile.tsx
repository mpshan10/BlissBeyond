import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, MapPin, PencilLine, Power, Trash2, UserRound } from "lucide-react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    bookings,
    packages,
    venues,
    services,
    logout,
    cancelBooking,
    sessionUserId,
  } = useBliss();
  const userBookings = currentUser
    ? bookings.filter((booking) => booking.customerId === currentUser.id)
    : [];

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Customer Profile</span>
            <h1 className="mt-2 mb-2">Your booking details live here.</h1>
            <p className="mb-0 page-subcopy">
              This page shows the same booking information used by the rest of the flow.
            </p>
          </div>
        </div>

        {!currentUser ? (
          <div className="panel">
            <div className="panel__body text-center">
              <UserRound size={32} className="mb-3" />
              <h3 className="mb-2">No customer session found</h3>
              <p className="text-ink-soft mb-4">
                Sign in with the demo account or register a new customer to view your booking
                profile.
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Link className="btn btn-gold" to="/login">
                  Login
                </Link>
                <Link className="btn btn-outline-forest" to="/register">
                  Register
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-grid">
            <div className="panel">
              <div className="panel__head">
                <div>
                  <h5 className="mb-1">Customer information</h5>
                  <p className="small text-ink-soft mb-0">Current signed-in customer.</p>
                </div>
                <button
                  className="btn btn-outline-forest btn-sm"
                  type="button"
                  onClick={() => logout()}
                >
                  <Power size={14} className="me-1" />
                  Logout
                </button>
              </div>
              <div className="panel__body">
                <div className="profile-card">
                  <div className="profile-avatar">
                    {currentUser.firstName.slice(0, 1)}
                    {currentUser.lastName.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="mb-1">
                      {currentUser.firstName} {currentUser.lastName}
                    </h3>
                    <p className="text-ink-soft mb-1">{currentUser.email}</p>
                    <p className="text-ink-soft mb-0">
                      {currentUser.phone || "Phone not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <h5 className="mb-1">Current selections</h5>
                  <p className="small text-ink-soft mb-0">
                    Your saved bookings and draft selections.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <Link className="btn btn-outline-forest btn-sm" to="/packages">
                    Edit booking
                  </Link>
                  <Link className="btn btn-gold btn-sm" to="/booking">
                    Review
                  </Link>
                </div>
              </div>
              <div className="panel__body">
                {userBookings.length ? (
                  <div className="stack">
                    {userBookings.map((booking) => (
                      <article className="booking-card" key={booking.id}>
                        <div className="booking-card__head">
                          <strong>
                            {packages.find((item) => item.id === booking.packageId)?.name ??
                              "Package"}
                          </strong>
                          <span className={`status ${booking.status.toLowerCase()}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="booking-card__meta">
                          <span>
                            <CalendarDays size={14} /> {booking.bookingDate}
                          </span>
                          <span>
                            <Clock3 size={14} /> {formatTime(booking.bookingTime)}
                          </span>
                          <span>
                            <MapPin size={14} />{" "}
                            {venues.find((item) => item.id === booking.venueId)?.name ?? "Venue"}
                          </span>
                        </div>
                        <div className="booking-card__meta">
                          <span>Total: LKR {booking.total.toLocaleString()}</span>
                          <span>Selected services: {booking.serviceIds.length}</span>
                        </div>
                        <div className="d-flex gap-2 flex-wrap mt-2">
                          <button
                            className="btn btn-outline-forest btn-sm"
                            type="button"
                            onClick={() => navigate({ to: "/booking" })}
                          >
                            <PencilLine size={14} className="me-1" />
                            Review
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={() => cancelBooking(booking.id)}
                          >
                            <Trash2 size={14} className="me-1" />
                            Cancel
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="mb-3">No bookings yet. Start by choosing a package.</p>
                    <Link className="btn btn-gold" to="/packages">
                      Browse packages
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <h5 className="mb-1">Booking status</h5>
                  <p className="small text-ink-soft mb-0">
                    The newest booking status mirrors the admin panel.
                  </p>
                </div>
              </div>
              <div className="panel__body">
                <div className="status-list">
                  {bookings
                    .filter((booking) => booking.customerId === sessionUserId)
                    .slice(0, 3)
                    .map((booking) => (
                      <div className="status-row" key={booking.id}>
                        <span>{booking.id.slice(-6)}</span>
                        <span className={`status ${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatTime(time: string) {
  const [hours] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const formatted = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatted}:00 ${suffix}`;
}
