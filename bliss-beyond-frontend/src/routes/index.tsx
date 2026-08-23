import { Link, createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  CalendarDays,
  ChevronRight,
  Sparkles,
  Users,
  Building2,
  UtensilsCrossed,
} from "lucide-react";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { packages, venues, currentUser } = useBliss();

  const featuredPackages = packages.slice(0, 4);
  const featuredVenues = venues.slice(0, 3);

  return (
    <>
      <section className="bb-hero">
        <div
          className="bb-hero__bg"
          style={{ backgroundImage: "url('/prototype/assets/img/hero.jpg')" }}
        />
        <div className="container bb-hero__inner py-5">
          <div className="col-lg-7">
            <span className="eyebrow">Events & Catering · Est. 2014</span>
            <h1 className="mt-3 mb-3">
              Celebrations designed with intention, served with elegance.
            </h1>
            <p className="lead mb-4 hero-copy">
              Weddings, birthdays, corporate galas and everything in between, planned end to end
              with one connected booking flow.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-gold" to="/packages">
                Explore packages
              </Link>
              <Link className="btn btn-outline-light-gold" to="/venues">
                Browse venues
              </Link>
            </div>
            <div className="row g-4 mt-4 col-lg-10">
              <div className="col-4">
                <div className="bb-price text-white">1,200+</div>
                <div className="stat-label text-white-50">Events delivered</div>
              </div>
              <div className="col-4">
                <div className="bb-price text-white">42</div>
                <div className="stat-label text-white-50">Partner venues</div>
              </div>
              <div className="col-4">
                <div className="bb-price text-white">4.9</div>
                <div className="stat-label text-white-50">Average rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-5">
              <span className="eyebrow">What we do</span>
              <h2 className="mt-2">Featured services</h2>
              <hr className="rule" />
              <p className="text-ink-soft">
                One team for planning, catering, décor and coordination so your day runs on a single
                timeline.
              </p>
              <Link className="btn btn-forest" to="/catering">
                Build your catering plan
              </Link>
            </div>
            <div className="col-lg-7">
              <div className="row g-3">
                <FeatureCard
                  icon={CalendarDays}
                  title="Full Event Planning"
                  text="End-to-end planning, timelines and on-day coordination."
                />
                <FeatureCard
                  icon={UtensilsCrossed}
                  title="Premium Catering"
                  text="Plated, buffet and live-station menus crafted for your event."
                />
                <FeatureCard
                  icon={Sparkles}
                  title="Décor & Floral Design"
                  text="Concept boards, floral installations and stage styling."
                />
                <FeatureCard
                  icon={Building2}
                  title="Venue Sourcing"
                  text="Curated venue matches with live availability checks."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container">
          <div className="text-center mb-5">
            <span className="eyebrow">Curated</span>
            <h2 className="mt-2">Signature event packages</h2>
            <hr className="rule rule-center" />
            <p className="text-ink-soft col-lg-6 mx-auto">
              Transparent pricing, fully customisable, and connected to the venues that can actually
              host them.
            </p>
          </div>
          <div className="package-grid">
            {featuredPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
          <div className="text-center mt-4">
            <Link className="btn btn-outline-forest" to="/packages">
              View all packages
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="ai-panel row g-4 align-items-center reveal in">
            <div className="col-lg-6">
              <span className="eyebrow">Connected booking</span>
              <h2 className="mt-2">Choose a package, lock a date, and keep every step together.</h2>
              <p className="text-white-75">
                {currentUser
                  ? `You are signed in as ${currentUser.firstName}. Your selections will stay with you across packages, venues, catering and profile.`
                  : "Sign in to save your draft booking and keep it synced between your pages."}
              </p>
              <Link className="btn btn-gold" to="/booking">
                Review your booking
              </Link>
            </div>
            <div className="col-lg-6">
              <div className="ai-result">
                <div className="eyebrow mb-2">Sample booking path</div>
                <h4 className="mb-1">Wedding Gold booking</h4>
                <p className="small text-ink-soft">
                  Package, venue, catering and services saved in one draft.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="ai-chip">Package</span>
                  <span className="ai-chip">Date & time</span>
                  <span className="ai-chip">Venue match</span>
                  <span className="ai-chip">Catering</span>
                  <span className="ai-chip">Profile sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-end mb-4">
            <div>
              <span className="eyebrow">Spaces</span>
              <h2 className="mt-2 mb-0">Venues we love</h2>
            </div>
            <Link className="btn btn-outline-forest" to="/venues">
              Browse venues
            </Link>
          </div>
          <div className="package-grid">
            {featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="p-5 rounded-4 text-center callout">
            <h2 className="callout-title">Ready to start planning?</h2>
            <p className="col-lg-6 mx-auto callout-copy">
              Create an account to save packages, request quotations and track your booking from
              brief to celebration.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Link className="btn btn-gold" to={currentUser ? "/profile" : "/register"}>
                {currentUser ? "Open your profile" : "Create free account"}
              </Link>
              <Link className="btn btn-outline-light-gold" to="/admin">
                Open admin panel
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="col-sm-6">
      <div className="bb-card reveal in">
        <div className="bb-card__body">
          <span className="feature-icon mb-3">
            <Icon className="icon-sm" />
          </span>
          <h5 className="mb-1">{title}</h5>
          <p className="small text-ink-soft mb-0">{text}</p>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: ReturnType<typeof useBliss>["packages"][number] }) {
  return (
    <article className="bb-card">
      <div className="bb-card__media" style={{ backgroundImage: `url('${pkg.image}')` }} />
      <div className="bb-card__body d-flex flex-column h-100">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="bb-badge">{pkg.category}</span>
          <span className="bb-badge gold">Up to {pkg.guestLimit}</span>
        </div>
        <h4 className="mb-1">{pkg.name}</h4>
        <p className="small text-ink-soft">{pkg.description}</p>
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
          <Link className="btn btn-outline-forest btn-sm" to="/packages">
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

function VenueCard({ venue }: { venue: ReturnType<typeof useBliss>["venues"][number] }) {
  return (
    <article className="bb-card">
      <div className="bb-card__media" style={{ backgroundImage: `url('${venue.image}')` }} />
      <div className="bb-card__body">
        <div className="d-flex justify-content-between mb-2">
          <span className="bb-badge">Venue</span>
          <span className="bb-badge gold">{venue.capacity} guests</span>
        </div>
        <h4 className="mb-1">{venue.name}</h4>
        <p className="small text-ink-soft mb-2">{venue.location}</p>
        <p className="small text-ink-soft">{venue.description}</p>
        <div className="d-flex justify-content-between align-items-center">
          <strong className="text-gold">LKR {venue.price.toLocaleString()} / day</strong>
          <Link className="btn btn-outline-forest btn-sm" to="/venues">
            Select venue
          </Link>
        </div>
      </div>
    </article>
  );
}
