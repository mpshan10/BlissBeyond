import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, BadgeCheck, CalendarDays, Clock3, MapPin, ReceiptText } from "lucide-react";
import type { ComponentType } from "react";
import { useBliss, useBookingPricing } from "../lib/bliss-data";

export const Route = createFileRoute("/booking")({
  component: BookingPage,
});

function BookingPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    selectedPackage,
    selectedVenue,
    selectedSpecialSet,
    selectedBeverage,
    selectedTea,
    selectedServices,
    draft,
    confirmBooking,
    currentBooking,
    bookings,
  } = useBliss();
  const pricing = useBookingPricing();

  const latestBooking =
    currentBooking ?? bookings.find((booking) => booking.customerId === currentUser?.id) ?? null;

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Review</span>
            <h1 className="mt-2 mb-2">Review your booking before confirmation.</h1>
            <p className="mb-0 page-subcopy">
              Everything below is pulled from the same draft booking you created in Packages, Venues
              and Catering.
            </p>
          </div>
        </div>

        {!currentUser ? (
          <div className="notice notice--warning mb-4">
            <AlertCircle size={18} />
            <span>
              Please sign in before confirming a booking. You can use the demo account at{" "}
              <strong>maya@bliss.test</strong>.
            </span>
            <Link className="btn btn-outline-forest btn-sm ms-auto" to="/login">
              Sign in
            </Link>
          </div>
        ) : null}

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Booking summary</h5>
              <p className="small text-ink-soft mb-0">
                Check the selections and total price before submitting.
              </p>
            </div>
            <Link className="btn btn-outline-forest btn-sm" to="/catering">
              Back to catering
            </Link>
          </div>
          <div className="panel__body">
            <div className="review-grid">
              <ReviewField label="Package" value={selectedPackage?.name ?? "Not selected"} />
              <ReviewField label="Venue" value={selectedVenue?.name ?? "Not selected"} />
              <ReviewField
                label="Date"
                value={draft.bookingDate || "Not selected"}
                icon={CalendarDays}
              />
              <ReviewField label="Time" value={draft.bookingTime || "Not selected"} icon={Clock3} />
              <ReviewField label="Special Set" value={selectedSpecialSet?.name ?? "Not selected"} />
              <ReviewField label="Beverage" value={selectedBeverage?.name ?? "Not selected"} />
              <ReviewField label="Tea" value={selectedTea?.name ?? "Not selected"} />
              <ReviewField
                label="Extra services"
                value={
                  selectedServices.length
                    ? selectedServices.map((item) => item.name).join(", ")
                    : "None selected"
                }
              />
            </div>
          </div>
        </div>

        <div className="review-panel review-panel--stacked">
          <div className="review-total">
            <span className="eyebrow">Estimated total</span>
            <h2 className="mb-1">LKR {pricing.toLocaleString()}</h2>
            <p className="small text-ink-soft mb-0">
              The total updates from the actual selections in your booking draft.
            </p>
          </div>
          <div className="review-actions">
            <button
              className="btn btn-gold"
              type="button"
              disabled={
                !currentUser ||
                !selectedPackage ||
                !selectedVenue ||
                !draft.bookingDate ||
                !draft.bookingTime
              }
              onClick={() => {
                const result = confirmBooking();
                if (result.ok) {
                  navigate({ to: "/confirmation" });
                }
              }}
            >
              Confirm booking
            </button>
            <Link className="btn btn-outline-forest" to="/profile">
              Go to profile
            </Link>
          </div>
        </div>

        {latestBooking ? (
          <div className="panel mt-4">
            <div className="panel__head">
              <div>
                <h5 className="mb-1">Latest booking</h5>
                <p className="small text-ink-soft mb-0">
                  Your most recent confirmed or pending booking.
                </p>
              </div>
              <span className={`status ${latestBooking.status.toLowerCase()}`}>
                {latestBooking.status}
              </span>
            </div>
            <div className="panel__body">
              <div className="mini-meta mb-2">
                <ReceiptText size={14} />
                <span>Booking #{latestBooking.id.slice(-6)}</span>
              </div>
              <div className="mini-meta mb-2">
                <MapPin size={14} />
                <span>{selectedVenue?.name ?? "Venue selected in profile"}</span>
              </div>
              <div className="mini-meta">
                <BadgeCheck size={14} />
                <span>Total: LKR {latestBooking.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ReviewField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="review-field">
      <span className="review-field__label">
        {Icon ? <Icon size={14} /> : null}
        {label}
      </span>
      <strong className="review-field__value">{value}</strong>
    </div>
  );
}
