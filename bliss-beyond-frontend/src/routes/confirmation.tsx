import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Clock3, MapPin } from "lucide-react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/confirmation")({
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { currentBooking, packages, venues, currentUser } = useBliss();

  return (
    <section className="section">
      <div className="container">
        <div className="panel">
          <div className="panel__body text-center">
            <BadgeCheck size={44} className="text-gold mb-3" />
            <h1 className="mb-2">Your booking is confirmed</h1>
            <p className="text-ink-soft mb-4">
              {currentUser ? `Thanks, ${currentUser.firstName}.` : "Thanks."} Your selections have
              been saved and are visible in your profile.
            </p>
            {currentBooking ? (
              <div className="confirmation-summary">
                <div>
                  <strong>
                    {packages.find((item) => item.id === currentBooking.packageId)?.name ??
                      "Package"}
                  </strong>
                </div>
                <div className="mini-meta">
                  <CalendarDays size={14} />
                  {currentBooking.bookingDate}
                </div>
                <div className="mini-meta">
                  <Clock3 size={14} />
                  {currentBooking.bookingTime}
                </div>
                <div className="mini-meta">
                  <MapPin size={14} />
                  {venues.find((item) => item.id === currentBooking.venueId)?.name ?? "Venue"}
                </div>
              </div>
            ) : null}
            <div className="d-flex justify-content-center gap-2 flex-wrap mt-4">
              <Link className="btn btn-gold" to="/profile">
                Open profile
              </Link>
              <Link className="btn btn-outline-forest" to="/packages">
                New booking
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
