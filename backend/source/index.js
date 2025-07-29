import express from "express";
import "dotenv/config";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/users.js"
import passwordRoutes from "./routes/password.js"
import settingsRoutes from "./routes/settings.js"
import errorHandler from "./middleware/errorHandler.js";
import "./lib/keepAlive.js"
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.use(compression());

app.get("/healthz", (req, res) => {
    res.send("API is running...");
});

app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is alive" });
});

app.use(cors({
    origin: process.env.FRONTEND_URL, // Frontend URL (e.g., http://localhost:3000)
    credentials: true // Allow cookies/auth headers
}));

app.use(helmet()); // Add secure HTTP headers
app.use(express.urlencoded({ extended: true })); // For parsing form data

const PORT = process.env.PORT || 3001;

app.use(express.json()); // Important for parsing req.body

app.use("/api/auth", authRoutes);

app.use("/api/users", usersRoutes);

app.use("/api/password", passwordRoutes);

app.use("/api/settings", settingsRoutes)

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});