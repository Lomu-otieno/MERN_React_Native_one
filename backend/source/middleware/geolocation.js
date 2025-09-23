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
    return cached;
  }

  await nominatimLimiter.wait();
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Lomu-dating-App/1.0 (lomuotieno@gmail.com)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      );
      return "Unknown location";
    }

    const data = await response.json();

    // Extract location name with fallbacks
    const locationName =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.suburb ||
      data.display_name ||
      `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    // Cache the result
    setCachedLocation(latitude, longitude, locationName);
    return locationName;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Geocoding request timed out");
    } else {
      console.error("Geocoding failed:", error.message);
    }
    return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  }
}
