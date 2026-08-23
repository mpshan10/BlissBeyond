import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useBliss, useBookingPricing } from "../lib/bliss-data";

export const Route = createFileRoute("/catering")({
  component: CateringPage,
});

function CateringPage() {
  const navigate = useNavigate();
  const {
    draft,
    selectedPackage,
    selectedVenue,
    services,
    chooseSpecialSet,
    chooseBeverage,
    chooseTea,
    toggleService,
    selectedSpecialSet,
    selectedBeverage,
    selectedTea,
    selectedServices,
  } = useBliss();

  const pricing = useBookingPricing();
  const specialSets = services.filter((service) => service.group === "special-set");
  const beverages = services.filter((service) => service.group === "beverage");
  const teas = services.filter((service) => service.group === "tea");
  const addOnServices = services.filter((service) => service.group === "service");

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container">
            <span className="eyebrow">Catering</span>
            <h1 className="mt-2 mb-2">Choose catering and services that match your event.</h1>
            <p className="mb-0 page-subcopy">
              Special Set, Beverage and Tea remain part of the catering experience. Add-on food has
              been removed.
            </p>
          </div>
        </div>

        <div className="summary-strip mb-4">
          <SummaryItem label="Package" value={selectedPackage?.name ?? "Pick a package"} />
          <SummaryItem label="Venue" value={selectedVenue?.name ?? "Pick a venue"} />
          <SummaryItem label="Date" value={draft.bookingDate || "Choose a date"} />
          <SummaryItem label="Time" value={draft.bookingTime || "Choose a time"} />
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Special Set</h5>
              <p className="small text-ink-soft mb-0">Choose one special set for the event.</p>
            </div>
            <Link className="btn btn-outline-forest btn-sm" to="/venues">
              Back to venues
            </Link>
          </div>
          <div className="panel__body">
            <div className="choice-grid choice-grid--three">
              {specialSets.map((service) => (
                <OptionCard
                  key={service.id}
                  title={service.name}
                  description={service.description}
                  price={service.price}
                  image={service.image}
                  selected={selectedSpecialSet?.id === service.id}
                  actionLabel={selectedSpecialSet?.id === service.id ? "Selected" : "Choose"}
                  onAction={() => chooseSpecialSet(service.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Beverage</h5>
              <p className="small text-ink-soft mb-0">Choose one beverage option.</p>
            </div>
          </div>
          <div className="panel__body">
            <div className="choice-grid choice-grid--four">
              {beverages.map((service) => (
                <OptionCard
                  key={service.id}
                  title={service.name}
                  description={service.description}
                  price={service.price}
                  selected={selectedBeverage?.id === service.id}
                  actionLabel={selectedBeverage?.id === service.id ? "Selected" : "Choose"}
                  onAction={() => chooseBeverage(service.id)}
                  compact
                />
              ))}
            </div>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Tea</h5>
              <p className="small text-ink-soft mb-0">Choose one tea option.</p>
            </div>
          </div>
          <div className="panel__body">
            <div className="choice-grid choice-grid--four">
              {teas.map((service) => (
                <OptionCard
                  key={service.id}
                  title={service.name}
                  description={service.description}
                  price={service.price}
                  selected={selectedTea?.id === service.id}
                  actionLabel={selectedTea?.id === service.id ? "Selected" : "Choose"}
                  onAction={() => chooseTea(service.id)}
                  compact
                />
              ))}
            </div>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel__head">
            <div>
              <h5 className="mb-1">Other Services</h5>
              <p className="small text-ink-soft mb-0">
                Select any extra services you want to include.
              </p>
            </div>
          </div>
          <div className="panel__body">
            <div className="choice-grid choice-grid--three">
              {addOnServices.map((service) => {
                const selected = selectedServices.some((item) => item.id === service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={`service-card ${selected ? "selected" : ""}`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className="service-card__top">
                      <div>
                        <div className="service-card__title">{service.name}</div>
                        <div className="service-card__desc">{service.description}</div>
                      </div>
                      <div className="service-card__price">
                        LKR {service.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="service-card__footer">
                      {selected ? (
                        <span className="service-tag service-tag--active">
                          <CheckCircle2 size={14} />
                          Added
                        </span>
                      ) : (
                        <span className="service-tag">
                          <Plus size={14} />
                          Add service
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="review-panel">
          <div>
            <span className="eyebrow">Running total</span>
            <h2 className="mb-1">LKR {pricing.toLocaleString()}</h2>
            <p className="small text-ink-soft mb-0">
              Total updates when you add or remove selections.
            </p>
          </div>
          <div className="review-actions">
            <Link className="btn btn-outline-forest" to="/booking">
              Review booking
            </Link>
            <button
              className="btn btn-gold"
              type="button"
              onClick={() => navigate({ to: "/booking" })}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OptionCard({
  title,
  description,
  price,
  image,
  selected,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  description: string;
  price: number;
  image?: string;
  selected: boolean;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  return (
    <article className={`choice-card ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}>
      {image ? (
        <div className="choice-card__media" style={{ backgroundImage: `url('${image}')` }} />
      ) : null}
      <div className="choice-card__body">
        <h4>{title}</h4>
        <p>{description}</p>
        <div className="choice-card__footer">
          <strong>LKR {price.toLocaleString()}</strong>
          <button className="btn btn-outline-forest btn-sm" type="button" onClick={onAction}>
            {selected ? "Selected" : actionLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
