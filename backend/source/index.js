import express from "express";
import "dotenv/config";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/authRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json()); // Important for parsing req.body

app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});