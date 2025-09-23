import fetch from "node-fetch";
import { nominatimLimiter } from "./rateLimiter.js";

// Simple cache implementation
const locationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedLocation(lat, lon) {
  const key = `${lat.toFixed(6)}_${lon.toFixed(6)}`;
  const cached = locationCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.location;
  }

  return null;
}

function setCachedLocation(lat, lon, location) {
  const key = `${lat.toFixed(6)}_${lon.toFixed(6)}`;
  locationCache.set(key, {
    location,
    timestamp: Date.now(),
  });
}

export async function getLocationName(latitude, longitude) {
  // Check cache first
  const cached = getCachedLocation(latitude, longitude);
  if (cached) {
    console.log(
      `📍 Using cached location for (${latitude}, ${longitude}): ${cached}`
    );
    return cached;
  }

  console.log(
    `🌍 Fetching location for coordinates: (${latitude}, ${longitude})`
  );

  await nominatimLimiter.wait();
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15 seconds

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Lomu-dating-App/1.0 (lomuotieno@gmail.com)",
        Accept: "application/json",
        "Accept-Language": "en", // Specify language for better results
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `❌ Nominatim API error: ${response.status} ${response.statusText}`
      );
      // Try to get error details from response body
      try {
        const errorText = await response.text();
        console.error(`❌ Nominatim error details: ${errorText}`);
      } catch (e) {
        console.error("❌ Could not read error response body");
      }
      return "Unknown Location";
    }

    const data = await response.json();
    console.log(`✅ Nominatim response received:`, {
      display_name: data.display_name?.substring(0, 100) + "...",
      address: data.address,
    });

    // Enhanced location extraction with better fallbacks
    let locationName = "Unknown Location";

    if (data.address) {
      locationName =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.municipality ||
        data.address.county ||
        data.address.state ||
        data.address.region ||
        data.address.country;
    }

    // If no specific location found, use the first part of display_name
    if (locationName === "Unknown Location" && data.display_name) {
      const parts = data.display_name.split(",");
      if (parts.length > 0) {
        locationName = parts[0].trim();
      }
    }

    // If we still have "Unknown Location", try to construct from available address components
    if (locationName === "Unknown Location" && data.address) {
      const components = [];
      if (data.address.village) components.push(data.address.village);
      if (data.address.county) components.push(data.address.county);
      if (data.address.state) components.push(data.address.state);
      if (data.address.country) components.push(data.address.country);

      if (components.length > 0) {
        locationName = components.slice(0, 2).join(", ");
      }
    }

    console.log(`📍 Determined location name: ${locationName}`);

    // Cache the result
    setCachedLocation(latitude, longitude, locationName);

    return locationName;
  } catch (error) {
    console.error("❌ Geocoding failed with error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    if (error.name === "AbortError") {
      console.error("⏰ Geocoding request timed out after 15 seconds");
      return "Location Unavailable";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      console.error("🌐 Network error: Cannot reach Nominatim server");
      return "Network Error";
    } else {
      console.error("❌ Unexpected geocoding error");
      return "Unknown Location";
    }
  }
}
