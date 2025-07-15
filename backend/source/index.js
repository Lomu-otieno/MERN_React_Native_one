import express from "express";
import "dotenv/config";
import connectDB from "./lib/db.js"

import authRoutes from "./routes/authRoutes.js"

const app = express();
const PORT = process.env.PORT || 3001

console.log({ PORT });

app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});