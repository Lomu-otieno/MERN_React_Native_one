import express from "express";
import "dotenv/config";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/users.js";
import passwordRoutes from "./routes/password.js";
import settingsRoutes from "./routes/settings.js";
import errorHandler from "./middleware/errorHandler.js";
import chatRoutes from "./routes/chatRoutes.js";
import revenueRouter from "./routes/revenue.js";
import "./lib/keepAlive.js";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

// Middleware
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      process.env.LOCALHOST,
      process.env.FRONTEND_URL,
      process.env.PASSWORD_URI,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    // origin: ["http://localhost:5500", process.env.FRONTEND_URL],
    credentials: true,
  })
);

// Routes
app.get("/healthz", (req, res) => res.send("API is running..."));
app.get("/", (req, res) => res.json({"mesage": "Server is running!"});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chatAdmin", chatRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/revenue", revenueRouter);

// Configuration endpoint
app.get("/api/config", (req, res) => {
  res.json({
    SERVER_URL: process.env.SERVER_URL,
    ADMIN_ID: process.env.ADMIN_ID,
  });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
