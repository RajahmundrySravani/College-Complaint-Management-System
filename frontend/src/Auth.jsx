
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

const AUTH_API = "http://localhost:5000/api/auth";

function Auth({ mode = "login" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState(
    location.state?.message || ""
  );
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!isRegister);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const response = await fetch(`${AUTH_API}/me`, {
          credentials: "include",
        });

        if (!active) return;

        if (!response.ok) {
          setCheckingSession(false);
          return;
        }

        const data = await response.json();

        if (!active) return;

        if (data.user?.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }

        if (data.user?.role === "student") {
          navigate("/student", { replace: true });
          return;
        }

        setCheckingSession(false);
      } catch {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    if (!isRegister) {
      checkLogin();
    }

    return () => {
      active = false;
    };
  }, [isRegister, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "rollNumber"
          ? value.toUpperCase()
          : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("info");
    setLoading(true);

    try {
      const requestBody = {
        ...form,
        rollNumber: form.rollNumber.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
      };

      const response = await fetch(
        `${AUTH_API}/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      if (isRegister) {
        navigate("/", {
          replace: true,
          state: {
            message: "Account created successfully! Please log in.",
          },
        });
        return;
      }

      if (!data.user?.role) {
        throw new Error(
          "The server did not return a valid user account."
        );
      }

      if (data.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (data.user.role === "student") {
        navigate("/student", { replace: true });
      } else {
        await fetch(`${AUTH_API}/logout`, {
          method: "POST",
          credentials: "include",
        });

        throw new Error("This account has an invalid role.");
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message || "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession && !isRegister) {
    return (
      <main className="app">
        <section className="panel">
          <p>Checking your login session...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">CAMPUS CARE</p>

        <h1>
          {isRegister ? "Student Registration" : "Welcome Back"}
        </h1>

        <p>
          {isRegister
            ? "Create an account to report campus problems."
            : "Log in to access your complaint portal."}
        </p>
      </header>

      <section className="panel">
        <h2>
          {isRegister ? "Create Student Account" : "Login"}
        </h2>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label>
                College Roll Number
                <input
                  type="text"
                  name="rollNumber"
                  value={form.rollNumber}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="e.g. 24A81A61C0"
                  required
                />
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete={isRegister ? "email" : "username"}
              placeholder="Enter your email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete={
                isRegister ? "new-password" : "current-password"
              }
              minLength={isRegister ? 8 : undefined}
              placeholder="Enter your password"
              required
            />
          </label>

          {isRegister && (
            <small>
              Password must contain at least 8 characters.
            </small>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        {message && (
          <p
            className={`message ${messageType}`}
            role="status"
          >
            {message}
          </p>
        )}

        <p>
          {isRegister ? "Already registered? " : "New student? "}
          <Link to={isRegister ? "/" : "/register"}>
            {isRegister ? "Go to Login" : "Create an account"}
          </Link>
        </p>

        <p>
          <Link to="/" replace>
            Back to Home
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Auth;