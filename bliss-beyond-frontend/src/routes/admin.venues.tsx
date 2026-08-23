import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { useBliss, type VenueItem } from "../lib/bliss-data";

export const Route = createFileRoute("/admin/venues")({
  component: AdminVenuesPage,
});

function AdminVenuesPage() {
  const { currentUser, venues, packages, upsertVenue, removeVenue } = useBliss();
  const [editingId, setEditingId] = useState<string | null>(venues[0]?.id ?? null);

  if (currentUser?.role !== "admin") return <Gate />;

  const editing = venues.find((item) => item.id === editingId) ?? venues[0];

  return (
    <AdminShell title="Venues" backTo="/admin">
      <div className="admin-layout">
        <div className="panel">
          <div className="panel__head">
            <h5 className="mb-0">Venue list</h5>
            <button
              className="btn btn-outline-forest btn-sm"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Add new
            </button>
          </div>
          <div className="panel__body">
            <div className="admin-list">
              {venues.map((item) => (
                <button
                  key={item.id}
                  className={`admin-list__item ${editingId === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setEditingId(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.location}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <VenueEditor
          key={editing?.id ?? "new"}
          initial={editing}
          packages={packages}
          onSave={(input) => {
            upsertVenue(input);
            setEditingId(input.id ?? venues[0]?.id ?? null);
          }}
          onDelete={() => {
            if (editing?.id) {
              removeVenue(editing.id);
              setEditingId(null);
            }
          }}
        />
      </div>
    </AdminShell>
  );
}

function VenueEditor({
  initial,
  packages,
  onSave,
  onDelete,
}: {
  initial?: VenueItem;
  packages: ReturnType<typeof useBliss>["packages"];
  onSave: (input: Partial<VenueItem> & { packageIds: string[] }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 0));
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [image, setImage] = useState(initial?.image ?? "/prototype/assets/img/venue-2.jpg");
  const [packageIds, setPackageIds] = useState<string[]>(initial?.packageIds ?? []);
  const [amenities, setAmenities] = useState((initial?.amenities ?? []).join("\n"));

  return (
    <div className="panel">
      <div className="panel__head">
        <h5 className="mb-0">{initial ? `Edit ${initial.name}` : "Add venue"}</h5>
        <button
          className="btn btn-gold btn-sm"
          type="button"
          onClick={() =>
            onSave({
              id: initial?.id,
              name,
              location,
              description,
              capacity: Number(capacity) || 0,
              price: Number(price) || 0,
              image,
              packageIds,
              amenities: amenities
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        >
          Save
        </button>
      </div>
      <div className="panel__body">
        <div className="field-row">
          <label className="field">
            <span className="form-label">Name</span>
            <input
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="form-label">Location</span>
            <input
              className="form-control"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>
        </div>
        <label className="field mb-3">
          <span className="form-label">Description</span>
          <textarea
            className="form-control"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="form-label">Capacity</span>
            <input
              className="form-control"
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="form-label">Price</span>
            <input
              className="form-control"
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
        </div>
        <label className="field mb-3">
          <span className="form-label">Image</span>
          <input
            className="form-control"
            value={image}
            onChange={(event) => setImage(event.target.value)}
          />
        </label>
        <label className="field mb-3">
          <span className="form-label">Amenities</span>
          <textarea
            className="form-control"
            rows={4}
            value={amenities}
            onChange={(event) => setAmenities(event.target.value)}
          />
        </label>
        <div className="association-box">
          <div className="form-label mb-2">Packages</div>
          <div className="toggle-grid">
            {packages.map((pkg) => (
              <label className="toggle-item" key={pkg.id}>
                <input
                  type="checkbox"
                  checked={packageIds.includes(pkg.id)}
                  onChange={() =>
                    setPackageIds((current) =>
                      current.includes(pkg.id)
                        ? current.filter((id) => id !== pkg.id)
                        : [...current, pkg.id],
                    )
                  }
                />
                <span>{pkg.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap mt-3">
          <button
            className="btn btn-outline-danger btn-sm"
            type="button"
            onClick={onDelete}
            disabled={!initial?.id}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
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
