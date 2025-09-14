import axios from "axios";
import dotenv from "dotenv";
dotenv.config(); // Make sure environment variables are loaded

const SERVER_URL = "https://lomu-dating-backend.onrender.com";

if (!SERVER_URL) {
    console.error("SERVER_URL is not defined in .env");
    process.exit(1); // Exit to avoid silent failure
}

const keepAlive = async() => {
    try {
        const response = await axios.get(SERVER_URL);
        console.log("✅ Pinged server:", response.status);
    } catch (error) {
        console.error("❌ Server ping failed:", error.message);
    }
};

// Ping every 5 minutes
setInterval(keepAlive, 5 * 60 * 1000);

// Initial ping
keepAlive();