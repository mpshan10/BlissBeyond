import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { useBliss } from "../lib/bliss-data";

const timeSlots = ["09:00", "12:00", "15:00", "17:00", "19:00"];

export const Route = createFileRoute("/venues")({
  component: VenuesPage,
});

function VenuesPage() {
  const navigate = useNavigate();
  const {
    draft,
    setDraftDate,
    setDraftTime,
    chooseVenue,
    availableVenues,
    selectedPackage,
    packages,
  } = useBliss();

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Venues</span>
            <h1 className="mt-2 mb-2">Choose a venue that fits your package and time.</h1>
            <p className="mb-0 page-subcopy">
              Venue availability uses the same booking data as packages, so the two pages cannot
              contradict each other.
            </p>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Select date and time</h5>
              <p className="small text-ink-soft mb-0">
                {selectedPackage
                  ? `Showing venues for ${selectedPackage.name}.`
                  : "Choose a package first for more specific venue matches."}
              </p>
            </div>
            <Link className="btn btn-outline-forest btn-sm" to="/packages">
              Back to packages
            </Link>
          </div>
          <div className="panel__body">
            <div className="selection-grid">
              <label className="field">
                <span className="form-label">Event date</span>
                <div className="field-input">
                  <CalendarDays size={16} className="field-icon" />
                  <input
                    className="form-control"
                    type="date"
                    value={draft.bookingDate}
                    onChange={(event) => setDraftDate(event.target.value)}
                  />
                </div>
              </label>
              <label className="field">
                <span className="form-label">Event time</span>
                <div className="field-input">
                  <Clock3 size={16} className="field-icon" />
                  <select
                    className="form-select"
                    value={draft.bookingTime}
                    onChange={(event) => setDraftTime(event.target.value)}
                  >
                    <option value="">Choose a time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {formatTime(slot)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            {selectedPackage ? (
              <div className="availability-note mt-3">
                <ShieldCheck size={16} />
                <span>
                  Package match: <strong>{selectedPackage.name}</strong>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="package-grid">
          {(draft.bookingDate && draft.bookingTime ? availableVenues : availableVenues).map(
            (venue) => {
              const isAvailable =
                !draft.bookingDate || !draft.bookingTime
                  ? true
                  : availableVenues.some((item) => item.id === venue.id);
              const isSelected = draft.venueId === venue.id;
              const matchingPackages = packages.filter((pkg) => venue.packageIds.includes(pkg.id));
              return (
                <article className={`bb-card ${!isAvailable ? "is-disabled" : ""}`} key={venue.id}>
                  <div
                    className="bb-card__media"
                    style={{ backgroundImage: `url('${venue.image}')` }}
                  />
                  <div className="bb-card__body d-flex flex-column h-100">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="bb-badge">Venue</span>
                      <span className="bb-badge gold">{venue.capacity} guests</span>
                    </div>
                    <h4 className="mb-1">{venue.name}</h4>
                    <p className="small text-ink-soft mb-2">
                      <MapPin size={14} className="me-1" />
                      {venue.location}
                    </p>
                    <p className="small text-ink-soft">{venue.description}</p>
                    <div className="mini-meta">
                      <span>{matchingPackages.length} matching packages</span>
                    </div>
                    <div className="tag-row">
                      {matchingPackages.slice(0, 3).map((pkg) => (
                        <span className="bb-chip" key={pkg.id}>
                          {pkg.name}
                        </span>
                      ))}
                    </div>
                    <div className="package-footer mt-auto">
                      <div className="package-price">
                        <div className="stat-label">From</div>
                        <div className="bb-price">LKR {venue.price.toLocaleString()} / day</div>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-outline-forest btn-sm"
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            const result = chooseVenue(venue.id);
                            if (result.ok) {
                              navigate({ to: "/catering" });
                            }
                          }}
                        >
                          {isSelected ? "Selected" : isAvailable ? "Select venue" : "Booked"}
                        </button>
                        <Link className="btn btn-gold btn-sm" to="/catering">
                          Continue
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
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
