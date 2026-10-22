
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API = "https://college-complaint-management-system-yzh8.onrender.com/api";

const STATUSES = ["Pending", "In Progress", "Resolved"];

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function Admin() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  // Automatically hide messages after 3 seconds.
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  // Load all complaints from the backend.
  const loadComplaints = useCallback(async () => {
    const response = await fetch(`${API}/complaints`, {
      credentials: "include",
    });

    if (response.status === 401 || response.status === 403) {
      navigate("/", { replace: true });
      return;
    }

    const data = await readResponse(response);

    if (!Array.isArray(data)) {
      throw new Error(
        "The backend returned an unexpected complaints format."
      );
    }

    setComplaints(data);
  }, [navigate]);

  // Verify the logged-in user is an administrator.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        const data = await readResponse(response);

        if (data.user?.role !== "admin") {
          navigate("/", { replace: true });
          return;
        }

        if (active) {
          setUser(data.user);
          await loadComplaints();
        }
      } catch (error) {
        if (active) {
          showMessage(
            error.message || "Could not connect to the backend.",
            "error"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [navigate, loadComplaints]);

  // Refresh the complaint list.
  async function handleRefresh() {
    if (refreshing) return;

    setRefreshing(true);
    showMessage("");

    try {
      await loadComplaints();
      showMessage("Complaints refreshed successfully!", "success");
    } catch (error) {
      showMessage(
        error.message || "Could not load complaints.",
        "error"
      );
    } finally {
      setRefreshing(false);
    }
  }

  // Update a complaint's status.
  async function updateStatus(id, status) {
    if (!STATUSES.includes(status) || updatingId !== null) {
      return;
    }

    setUpdatingId(id);
    showMessage("");

    try {
      const response = await fetch(`${API}/complaints/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (response.status === 401) {
        navigate("/", { replace: true });
        return;
      }

      const data = await readResponse(response);

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint._id === id
            ? { ...complaint, ...data.complaint }
            : complaint
        )
      );

      showMessage(
        "Complaint status updated successfully!",
        "success"
      );
    } catch (error) {
      showMessage(
        error.message || "Could not update complaint status.",
        "error"
      );

      await loadComplaints().catch(() => {});
    } finally {
      setUpdatingId(null);
    }
  }

  // Log out the administrator.
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok && response.status !== 401) {
        await readResponse(response);
      }

      navigate("/", { replace: true });
    } catch (error) {
      showMessage(
        error.message || "Logout failed. Please try again.",
        "error"
      );
    } finally {
      setLoggingOut(false);
    }
  }

  // Filter complaints by status.
  const visibleComplaints =
    filter === "All"
      ? complaints
      : complaints.filter(
          (complaint) => complaint.status === filter
        );

  // Calculate dashboard statistics.
  const pending = complaints.filter(
    (complaint) => complaint.status === "Pending"
  ).length;

  const inProgress = complaints.filter(
    (complaint) => complaint.status === "In Progress"
  ).length;

  const resolved = complaints.filter(
    (complaint) => complaint.status === "Resolved"
  ).length;

  if (loading) {
    return (
      <main className="app">
        <p>Loading admin dashboard...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app">
        <section className="panel">
          <h2>Admin dashboard unavailable</h2>

          <p>
            {message ||
              "Please log in with an administrator account."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
          >
            Go to Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      {/* Dashboard header */}
      <header className="hero">
        <p className="eyebrow">CAMPUS CARE · ADMIN</p>

        <h1>Admin Dashboard</h1>

        <p>
          Welcome, {user.name || "Admin"}. Review complaints and
          update their status.
        </p>

        <button
          type="button"
          className="secondary"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      {/* Complaint statistics */}
      <section className="panel">
        <h2>Complaint Overview</h2>

        <div className="stats">
          <div className="stat-card">
            <span>Total Complaints</span>
            <strong>{complaints.length}</strong>
          </div>

          <div className="stat-card">
            <span>Pending</span>
            <strong>{pending}</strong>
          </div>

          <div className="stat-card">
            <span>In Progress</span>
            <strong>{inProgress}</strong>
          </div>

          <div className="stat-card">
            <span>Resolved</span>
            <strong>{resolved}</strong>
          </div>
        </div>

        {/* Status filter */}
        <label>
          Filter by status

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All complaints</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="secondary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh Complaints"}
        </button>

        {message && (
          <p
            className={`message ${messageType}`}
            role="status"
          >
            {message}
          </p>
        )}
      </section>

      {/* Complaint list */}
      <section className="complaints">
        <h2>Manage Complaints</h2>

        {visibleComplaints.length === 0 ? (
          <p>No complaints found for this filter.</p>
        ) : (
          visibleComplaints.map((complaint) => {
            const student =
              complaint.studentId &&
              typeof complaint.studentId === "object"
                ? complaint.studentId
                : null;

            return (
              <article
                className="complaint-card"
                key={complaint._id}
              >
                <div className="complaint-content">
                  <h3>{complaint.title}</h3>

                  <p>{complaint.description}</p>

                  <small>
                    Category: {complaint.category} · Location:{" "}
                    {complaint.location}
                  </small>

                  <div className="student-details">
                    <p>
                      <strong>Submitted by:</strong>{" "}
                      {student?.name || "Student details unavailable"}
                    </p>

                    <p>
                      <strong>Student email:</strong>{" "}
                      {student?.email || "Not available"}
                    </p>
                  </div>

                  <p>
                    Current status:{" "}
                    <strong>
                      {complaint.status || "Pending"}
                    </strong>
                  </p>

                  {/* Update status */}
                  <label>
                    Update status

                    <select
                      value={complaint.status || "Pending"}
                      disabled={updatingId !== null}
                      onChange={(event) =>
                        updateStatus(
                          complaint._id,
                          event.target.value
                        )
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  {updatingId === complaint._id && (
                    <small>Updating status...</small>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

export default Admin;
