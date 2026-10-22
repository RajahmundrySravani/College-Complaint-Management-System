
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);

  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load complaints belonging to the logged-in student
  const loadComplaints = useCallback(async () => {
    const response = await fetch(`${API}/complaints`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      navigate("/", { replace: true });
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to load complaints.");
    }

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response from the complaints API.");
    }

    setComplaints(data);
  }, [navigate]);

  // Check the login session when the page opens
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch(`${API}/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Could not verify your login.");
        }

        if (!data.user) {
          throw new Error("The server did not return your user details.");
        }

        if (data.user.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }

        if (data.user.role !== "student") {
          throw new Error("Your account does not have student access.");
        }

        setUser(data.user);
        await loadComplaints();
      } catch (error) {
        if (active) {
          setMessage(
            error.message ||
              "Could not connect to the backend. Check that it is running."
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

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Submit a new complaint
  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/complaints`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          location: form.location.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        navigate("/", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit complaint.");
      }

      setForm({
        title: "",
        category: "",
        location: "",
        description: "",
      });

      setMessage("Complaint submitted successfully!");

      // Reload complaints after a successful submission
      await loadComplaints();
    } catch (error) {
      setMessage(
        error.message ||
          "Something went wrong while submitting your complaint."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Log out and destroy the server-side session
  async function handleLogout() {
    setMessage("");

    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        throw new Error(data.message || "Logout failed.");
      }

      setUser(null);
      setComplaints([]);
      navigate("/", { replace: true });
    } catch (error) {
      setMessage(error.message || "Could not log out.");
    }
  }

  // Refresh the student's complaints
  async function handleRefresh() {
    setRefreshing(true);
    setMessage("");

    try {
      await loadComplaints();
    } catch (error) {
      setMessage(error.message || "Could not refresh complaints.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main className="app">
        <p>Checking your login and loading complaints...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app">
        <section className="panel">
          <h2>Unable to open the student portal</h2>
          <p className="message" role="alert">
            {message || "Please log in to continue."}
          </p>
          <Link to="/">Go to Home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">CAMPUS CARE · STUDENT</p>

        <h1>College Complaint Portal</h1>

        <p>Welcome, {user.name}. Help us make your campus better.</p>

        <button
          type="button"
          className="secondary"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <section className="panel">
        <h2>Submit a Complaint</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Complaint title
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Wi-Fi not working"
              maxLength={120}
              required
            />
          </label>

          <label>
            Category
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              <option value="Classroom">Classroom</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Internet">Internet / Wi-Fi</option>
              <option value="Cleanliness">Cleanliness</option>
              <option value="Water">Water</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Location
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Computer Lab"
              maxLength={150}
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Explain the problem..."
              rows={4}
              maxLength={2000}
              required
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="complaints">
        <div className="section-heading">
          <h2>My Complaints</h2>

          <button
            type="button"
            className="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {complaints.length === 0 ? (
          <p>You have not submitted any complaints yet.</p>
        ) : (
          complaints.map((complaint) => (
            <article className="complaint-card" key={complaint._id}>
              <div>
                <h3>{complaint.title}</h3>

                <p>{complaint.description}</p>

                <small>
                  {complaint.category} · {complaint.location}
                </small>

                {complaint.adminRemark && (
                  <p>
                    <strong>Admin remark:</strong> {complaint.adminRemark}
                  </p>
                )}
              </div>

              <span
                className={`status ${(complaint.status || "Pending").replace(
                  " ",
                  "-"
                )}`}
              >
                {complaint.status || "Pending"}
              </span>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;
