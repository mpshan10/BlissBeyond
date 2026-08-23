import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import type { PackageItem } from "../lib/bliss-data";
import { useBliss } from "../lib/bliss-data";

const timeSlots = ["09:00", "12:00", "15:00", "17:00", "19:00"];

export const Route = createFileRoute("/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const navigate = useNavigate();
  const {
    draft,
    setDraftDate,
    setDraftTime,
    choosePackage,
    availablePackages,
    venues,
    selectedPackage,
  } = useBliss();

  const visiblePackages =
    draft.bookingDate && draft.bookingTime ? availablePackages : availablePackages;

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Packages</span>
            <h1 className="mt-2 mb-2">Choose your package and lock a booking window.</h1>
            <p className="mb-0 page-subcopy">
              Select the date and time first so we can show only the packages that are actually
              available.
            </p>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Select date and time</h5>
              <p className="small text-ink-soft mb-0">
                Availability is checked against existing bookings.
              </p>
            </div>
            <Link className="btn btn-outline-forest btn-sm" to="/venues">
              Skip to venues
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
                  Current selection: <strong>{selectedPackage.name}</strong>
                  {venues.find((venue) => selectedPackage.venueIds.includes(venue.id))
                    ? " with matched venues available."
                    : "."}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="package-grid">
          {visiblePackages.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            const isAvailable =
              !draft.bookingDate || !draft.bookingTime
                ? true
                : availablePackages.some((item) => item.id === pkg.id);
            const matchingVenues = venues.filter((venue) => pkg.venueIds.includes(venue.id));
            return (
              <article className={`bb-card ${!isAvailable ? "is-disabled" : ""}`} key={pkg.id}>
                <div
                  className="bb-card__media"
                  style={{ backgroundImage: `url('${pkg.image}')` }}
                />
                <div className="bb-card__body d-flex flex-column h-100">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="bb-badge">{pkg.category}</span>
                    <span className="bb-badge gold">Up to {pkg.guestLimit}</span>
                  </div>
                  <h4 className="mb-1">{pkg.name}</h4>
                  <p className="small text-ink-soft">{pkg.description}</p>
                  <div className="mini-meta">
                    <MapPin size={14} />
                    <span>{matchingVenues.length} suitable venues</span>
                  </div>
                  <ul className="list-check mb-3">
                    {pkg.highlights.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="package-footer mt-auto">
                    <div className="package-price">
                      <div className="stat-label">From</div>
                      <div className="bb-price">LKR {pkg.price.toLocaleString()}</div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-outline-forest btn-sm"
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          const result = choosePackage(pkg.id);
                          if (result.ok) {
                            navigate({ to: "/venues" });
                          }
                        }}
                      >
                        {isSelected ? "Selected" : isAvailable ? "Select package" : "Booked"}
                      </button>
                      <Link className="btn btn-gold btn-sm" to="/venues">
                        View venues
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
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
