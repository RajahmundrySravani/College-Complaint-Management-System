import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";

const API = "https://college-complaint-management-system-yzh8.onrender.com/api";

function Home() {
  const navigate = useNavigate();

  const [student, setStudent] = useState({
    rollNumber: "",
    password: "",
  });

  const [admin, setAdmin] = useState({
    username: "",
    password: "",
  });

  const [messages, setMessages] = useState({
    student: "",
    admin: "",
  });

  const [loading, setLoading] = useState("");

  async function handleLogin(event, loginType) {
    event.preventDefault();

    if (loading) return;

    const credentials = loginType === "student" ? student : admin;

    setLoading(loginType);
    setMessages((previous) => ({
      ...previous,
      [loginType]: "",
    }));

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginType,
          ...credentials,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (data.user?.role !== loginType) {
        await fetch(`${API}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });

        throw new Error("Incorrect account type.");
      }

      // Clear the form values after successful login.
      if (loginType === "student") {
        setStudent({ rollNumber: "", password: "" });
      } else {
        setAdmin({ username: "", password: "" });
      }

      // Prevent the login page from remaining as the previous history entry.
      navigate(loginType === "admin" ? "/admin" : "/student", {
        replace: true,
      });
    } catch (error) {
      setMessages((previous) => ({
        ...previous,
        [loginType]:
          error.message || "Could not connect to the server.",
      }));
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="home-page">
      <header className="home-hero">
        <p className="eyebrow">CAMPUS CARE</p>

        <h1>College Complaint Management System</h1>

        <p>
          A better campus starts with your voice. Submit complaints,
          track progress, and help make your college better.
        </p>
      </header>

      <section className="login-section">
        <div className="login-heading">
          <h2>Welcome Back!</h2>
          <p>Choose your account type to continue.</p>
        </div>

        <div className="login-grid">
          {/* Student Login */}
          <article className="login-card student-login">
            <div className="login-icon" aria-hidden="true">
              🎓
            </div>

            <h2>Student Login</h2>

            <p className="login-description">
              Sign in to submit complaints and track their status.
            </p>

            <form
              autoComplete="off"
              onSubmit={(event) => handleLogin(event, "student")}
            >
              <label>
                College Roll Number
                <input
                  type="text"
                  name="campus-student-roll"
                  placeholder="Enter your roll number"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={student.rollNumber}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      rollNumber: event.target.value.toUpperCase(),
                    })
                  }
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="campus-student-password"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  value={student.password}
                  onChange={(event) =>
                    setStudent({
                      ...student,
                      password: event.target.value,
                    })
                  }
                  required
                />
              </label>

              {messages.student && (
                <p className="message error" role="alert">
                  {messages.student}
                </p>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={Boolean(loading)}
              >
                {loading === "student"
                  ? "Signing in..."
                  : "Login as Student"}
              </button>
            </form>

            <p className="register-link">
              New student? <Link to="/register">Create an account</Link>
            </p>
          </article>

          {/* Admin Login */}
          <article className="login-card admin-login">
            <div className="login-icon" aria-hidden="true">
              🛡️
            </div>

            <h2>Admin Login</h2>

            <p className="login-description">
              Sign in to review complaints and manage their status.
            </p>

            <form
              autoComplete="off"
              onSubmit={(event) => handleLogin(event, "admin")}
            >
              <label>
                Admin Username
                <input
                  type="text"
                  name="campus-admin-username"
                  placeholder="Enter admin username"
                  autoComplete="off"
                  spellCheck={false}
                  value={admin.username}
                  onChange={(event) =>
                    setAdmin({
                      ...admin,
                      username: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="campus-admin-password"
                  placeholder="Enter admin password"
                  autoComplete="new-password"
                  value={admin.password}
                  onChange={(event) =>
                    setAdmin({
                      ...admin,
                      password: event.target.value,
                    })
                  }
                  required
                />
              </label>

              {messages.admin && (
                <p className="message error" role="alert">
                  {messages.admin}
                </p>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={Boolean(loading)}
              >
                {loading === "admin"
                  ? "Signing in..."
                  : "Login as Admin"}
              </button>
            </form>

            <p className="admin-note">
              Administrator access only.
            </p>
          </article>
        </div>
      </section>

      <footer className="home-footer">
        <p>Campus Care · Making campus better, together.</p>
      </footer>
    </main>
  );
}

export default Home;