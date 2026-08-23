import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useBliss, type PackageItem } from "../lib/bliss-data";

export const Route = createFileRoute("/admin/packages")({
  component: AdminPackagesPage,
});

function AdminPackagesPage() {
  const { currentUser, packages, venues, upsertPackage, removePackage } = useBliss();
  const [editingId, setEditingId] = useState<string | null>(packages[0]?.id ?? null);

  if (currentUser?.role !== "admin") {
    return <Gate />;
  }

  const editing = packages.find((item) => item.id === editingId) ?? packages[0];

  return (
    <AdminShell title="Packages" backTo="/admin">
      <div className="admin-layout">
        <div className="panel">
          <div className="panel__head">
            <h5 className="mb-0">Package list</h5>
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
              {packages.map((item) => (
                <button
                  key={item.id}
                  className={`admin-list__item ${editingId === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setEditingId(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <PackageEditor
          key={editing?.id ?? "new"}
          initial={editing}
          venues={venues}
          onSave={(input) => {
            upsertPackage(input);
            setEditingId(input.id ?? packages[0]?.id ?? null);
          }}
          onDelete={() => {
            if (editing?.id) {
              removePackage(editing.id);
              setEditingId(null);
            }
          }}
        />
      </div>
    </AdminShell>
  );
}

function PackageEditor({
  initial,
  venues,
  onSave,
  onDelete,
}: {
  initial?: PackageItem;
  venues: ReturnType<typeof useBliss>["venues"];
  onSave: (input: Partial<PackageItem> & { venueIds: string[] }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [guestLimit, setGuestLimit] = useState(String(initial?.guestLimit ?? 0));
  const [image, setImage] = useState(initial?.image ?? "/prototype/assets/img/venue-2.jpg");
  const [venueIds, setVenueIds] = useState<string[]>(initial?.venueIds ?? []);
  const [highlights, setHighlights] = useState((initial?.highlights ?? []).join("\n"));

  return (
    <div className="panel">
      <div className="panel__head">
        <h5 className="mb-0">{initial ? `Edit ${initial.name}` : "Add package"}</h5>
        <button
          className="btn btn-gold btn-sm"
          type="button"
          onClick={() =>
            onSave({
              id: initial?.id,
              name,
              category,
              description,
              price: Number(price) || 0,
              guestLimit: Number(guestLimit) || 0,
              image,
              venueIds,
              highlights: highlights
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
            <span className="form-label">Category</span>
            <input
              className="form-control"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
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
            <span className="form-label">Price</span>
            <input
              className="form-control"
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="form-label">Guest limit</span>
            <input
              className="form-control"
              type="number"
              value={guestLimit}
              onChange={(event) => setGuestLimit(event.target.value)}
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
          <span className="form-label">Highlights</span>
          <textarea
            className="form-control"
            rows={4}
            value={highlights}
            onChange={(event) => setHighlights(event.target.value)}
          />
        </label>
        <div className="association-box">
          <div className="form-label mb-2">Venues</div>
          <div className="toggle-grid">
            {venues.map((venue) => (
              <label className="toggle-item" key={venue.id}>
                <input
                  type="checkbox"
                  checked={venueIds.includes(venue.id)}
                  onChange={() =>
                    setVenueIds((current) =>
                      current.includes(venue.id)
                        ? current.filter((id) => id !== venue.id)
                        : [...current, venue.id],
                    )
                  }
                />
                <span>{venue.name}</span>
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
