
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
require("dotenv").config();

const Complaint = require("./models/Complaint");
const User = require("./models/User");

const app = express();

// Allowed complaint categories
const ALLOWED_CATEGORIES = [
  "Classroom",
  "Laboratory",
  "Internet",
  "Cleanliness",
  "Water",
  "Other",
];

// Allowed complaint statuses
const ALLOWED_STATUSES = [
  "Pending",
  "In Progress",
  "Resolved",
];

// --------------------------------------------------
// Middleware
// --------------------------------------------------

// Render runs behind a proxy. Trust the proxy so Express
// can correctly detect HTTPS when setting secure cookies.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = [
  "https://college-complaint-management-system-hzze.onrender.com",
  "http://localhost:5175",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as
      // direct health checks, and known frontend origins.
      if (!origin || allowedOrigins.includes(origin) ||
          origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    name: "campus.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// --------------------------------------------------
// Authentication middleware
// --------------------------------------------------

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required.",
    });
  }

  next();
}

// --------------------------------------------------
// Home route
// --------------------------------------------------

app.get("/", (req, res) => {
  res.send("College Complaint Management API is running!");
});

// --------------------------------------------------
// Register a student
// --------------------------------------------------


app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, rollNumber, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof rollNumber !== "string" ||
      !rollNumber.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Enter your name, roll number, email, and a password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNumber = rollNumber.trim().toUpperCase();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { rollNumber: normalizedRollNumber },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.email === normalizedEmail
            ? "Email is already registered."
            : "Roll number is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      rollNumber: normalizedRollNumber,
      email: normalizedEmail,
      password: passwordHash,
      role: "student",
    });

    return res.status(201).json({
      message: "Student account created successfully. Please log in.",
      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or roll number is already registered.",
      });
    }

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
});


// --------------------------------------------------
// Log in
// --------------------------------------------------




app.post("/api/auth/login", async (req, res) => {
  try {
    const { loginType, rollNumber, username, password } = req.body;

    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Password is required.",
      });
    }

    let user;

    if (loginType === "student") {
      if (typeof rollNumber !== "string" || !rollNumber.trim()) {
        return res.status(400).json({
          message: "College roll number is required.",
        });
      }

      user = await User.findOne({
        rollNumber: rollNumber.trim().toUpperCase(),
        role: "student",
      });
    } else if (loginType === "admin") {
      if (
        typeof username !== "string" ||
        username.trim().toLowerCase() !== "admin"
      ) {
        return res.status(401).json({
          message: "Invalid admin username or password.",
        });
      }

      user = await User.findOne({
        username: "admin",
        role: "admin",
      });
    } else {
      return res.status(400).json({
        message: "Invalid login type.",
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid login credentials.",
      });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Session error:", sessionError);
        return res.status(500).json({
          message: "Unable to create session.",
        });
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber || null,
        role: user.role,
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError);
          return res.status(500).json({
            message: "Unable to save session.",
          });
        }

        return res.json({
          message: "Login successful.",
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error during login.",
    });
  }
});




// --------------------------------------------------
// Get logged-in user
// --------------------------------------------------

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: req.session.user,
  });
});

// --------------------------------------------------
// Log out
// --------------------------------------------------

app.post("/api/auth/logout", requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);
      return next(error);
    }

    res.clearCookie("campus.sid", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      message: "Logged out successfully.",
    });
  });
});

// --------------------------------------------------
// Submit a complaint (students only)
// --------------------------------------------------

app.post("/api/complaints", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== "student") {
      return res.status(403).json({
        message: "Only students can submit complaints.",
      });
    }

    const { title, category, location, description } = req.body;

    // Validate all required fields.
    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      typeof location !== "string" ||
      !location.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "Please fill in all complaint fields.",
      });
    }

    // Validate category.
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Please select a valid complaint category.",
      });
    }

    // Validate the logged-in student's ID.
    if (!mongoose.isValidObjectId(req.session.user.id)) {
      return res.status(401).json({
        message: "Invalid login session. Please log in again.",
      });
    }

    // Save the complaint with the logged-in student's ID.
    const complaint = await Complaint.create({
      title: title.trim(),
      category,
      location: location.trim(),
      description: description.trim(),
      status: "Pending",
      studentId: req.session.user.id,
    });

    return res.status(201).json({
      message: "Complaint submitted successfully!",
      complaint,
    });
  } catch (error) {
    console.error("Complaint creation error:", error);

    return res.status(500).json({
      message: "Failed to submit complaint.",
    });
  }
});

// --------------------------------------------------
// Get complaints
// Students: only their own complaints
// Admin: all complaints, including student names/emails
// --------------------------------------------------

app.get("/api/complaints", requireAuth, async (req, res) => {
  try {
    let filter = {};

    if (req.session.user.role === "student") {
      if (!mongoose.isValidObjectId(req.session.user.id)) {
        return res.status(401).json({
          message: "Invalid login session. Please log in again.",
        });
      }

      filter = {
        studentId: req.session.user.id,
      };
    } else if (req.session.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to view complaints.",
      });
    }

    const complaints = await Complaint.find(filter)
      .populate("studentId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(complaints);
  } catch (error) {
    console.error("Load complaints error:", error);

    return res.status(500).json({
      message: "Could not load complaints.",
    });
  }
});

// --------------------------------------------------
// Admin: update complaint status
// Return the updated complaint with student details
// --------------------------------------------------

app.patch(
  "/api/complaints/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid complaint ID.",
        });
      }

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid complaint status.",
        });
      }

      const complaint = await Complaint.findByIdAndUpdate(
        id,
        { $set: { status } },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("studentId", "name email")
        .lean();

      if (!complaint) {
        return res.status(404).json({
          message: "Complaint not found.",
        });
      }

      return res.json({
        message: "Status updated successfully.",
        complaint,
      });
    } catch (error) {
      console.error("Update complaint status error:", error);

      return res.status(500).json({
        message: "Could not update complaint status.",
      });
    }
  }
);

// --------------------------------------------------
// Admin: complaint statistics
// --------------------------------------------------

app.get(
  "/api/admin/stats",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const [total, pending, inProgress, resolved] =
        await Promise.all([
          Complaint.countDocuments(),
          Complaint.countDocuments({ status: "Pending" }),
          Complaint.countDocuments({ status: "In Progress" }),
          Complaint.countDocuments({ status: "Resolved" }),
        ]);

      return res.json({
        total,
        pending,
        inProgress,
        resolved,
      });
    } catch (error) {
      console.error("Load admin statistics error:", error);

      return res.status(500).json({
        message: "Could not load statistics.",
      });
    }
  }
);

// --------------------------------------------------
// Handle unexpected errors
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// Connect to MongoDB and start the server
// --------------------------------------------------

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  console.error(
    "Set MONGO_URI and SESSION_SECRET in your backend .env file."
  );

  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });