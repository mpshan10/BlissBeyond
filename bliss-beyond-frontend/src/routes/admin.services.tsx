import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBliss, type ServiceItem } from "../lib/bliss-data";

export const Route = createFileRoute("/admin/services")({
  component: AdminServicesPage,
});

function AdminServicesPage() {
  const { currentUser, services, upsertService, removeService } = useBliss();
  const [editingId, setEditingId] = useState<string | null>(services[0]?.id ?? null);

  if (currentUser?.role !== "admin") return <Gate />;

  const editing = services.find((item) => item.id === editingId) ?? services[0];

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container d-flex justify-content-between align-items-end flex-wrap gap-3">
            <div>
              <span className="eyebrow">Admin</span>
              <h1 className="mt-2 mb-2">Services</h1>
            </div>
            <Link className="btn btn-outline-light-gold" to="/admin">
              Back to admin
            </Link>
          </div>
        </div>
        <div className="admin-layout">
          <div className="panel">
            <div className="panel__head">
              <h5 className="mb-0">Service list</h5>
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
                {services.map((service) => (
                  <button
                    key={service.id}
                    className={`admin-list__item ${editingId === service.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setEditingId(service.id)}
                  >
                    <strong>{service.name}</strong>
                    <span>{service.group}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ServiceEditor
            key={editing?.id ?? "new"}
            initial={editing}
            onSave={(input) => {
              upsertService(input);
              setEditingId(input.id ?? services[0]?.id ?? null);
            }}
            onDelete={() => {
              if (editing?.id) {
                removeService(editing.id);
                setEditingId(null);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ServiceEditor({
  initial,
  onSave,
  onDelete,
}: {
  initial?: ServiceItem;
  onSave: (input: Partial<ServiceItem>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [group, setGroup] = useState<ServiceItem["group"]>(initial?.group ?? "service");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [image, setImage] = useState(initial?.image ?? "");

  return (
    <div className="panel">
      <div className="panel__head">
        <h5 className="mb-0">{initial ? `Edit ${initial.name}` : "Add service"}</h5>
        <button
          className="btn btn-gold btn-sm"
          type="button"
          onClick={() =>
            onSave({
              id: initial?.id,
              name,
              group,
              description,
              price: Number(price) || 0,
              image,
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
            <span className="form-label">Group</span>
            <select
              className="form-select"
              value={group}
              onChange={(event) => setGroup(event.target.value as ServiceItem["group"])}
            >
              <option value="special-set">Special Set</option>
              <option value="beverage">Beverage</option>
              <option value="tea">Tea</option>
              <option value="service">Other service</option>
            </select>
          </label>
        </div>
        <label className="field mb-3">
          <span className="form-label">Description</span>
          <textarea
            className="form-control"
            rows={4}
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
            <span className="form-label">Image</span>
            <input
              className="form-control"
              value={image}
              onChange={(event) => setImage(event.target.value)}
            />
          </label>
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
