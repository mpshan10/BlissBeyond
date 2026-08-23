import { Link, createFileRoute } from "@tanstack/react-router";
import { useBliss } from "../lib/bliss-data";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const { currentUser, users, bookings, packages } = useBliss();

  if (currentUser?.role !== "admin") return <Gate />;

  const customers = users.filter((user) => user.role === "customer");

  return (
    <section className="section">
      <div className="container">
        <div className="page-head mb-4">
          <div className="container d-flex justify-content-between align-items-end flex-wrap gap-3">
            <div>
              <span className="eyebrow">Admin</span>
              <h1 className="mt-2 mb-2">Customers</h1>
            </div>
            <Link className="btn btn-outline-light-gold" to="/admin">
              Back to admin
            </Link>
          </div>
        </div>
        <div className="panel">
          <div className="panel__body">
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Bookings</th>
                    <th>Latest package</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const customerBookings = bookings.filter(
                      (booking) => booking.customerId === customer.id,
                    );
                    const latestBooking = customerBookings[0];
                    return (
                      <tr key={customer.id}>
                        <td>
                          {customer.firstName} {customer.lastName}
                        </td>
                        <td>{customer.email}</td>
                        <td>{customer.phone || "-"}</td>
                        <td>{customerBookings.length}</td>
                        <td>
                          {latestBooking
                            ? (packages.find((item) => item.id === latestBooking.packageId)?.name ??
                              "-")
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
