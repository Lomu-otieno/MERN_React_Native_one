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

// Alternative geocoding service as fallback
async function tryAlternativeGeocoding(latitude, longitude) {
  try {
    // Try a simpler HTTP request or different endpoint
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    const fetchPromise = fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
      {
        headers: {
          "User-Agent": "Lomu-dating-App/1.0 (lomuotieno@gmail.com)",
        },
        timeout: 10000,
      }
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (response.ok) {
      const data = await response.json();
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.county ||
        "Unknown Area"
      );
    }
  } catch (error) {
    console.log("Alternative geocoding also failed:", error.message);
  }
  return null;
}

export async function getLocationName(latitude, longitude) {
  // Check cache first
  const cached = getCachedLocation(latitude, longitude);
  if (cached) {
    return cached;
  }

  console.log(
    `🌍 Attempting to fetch location for: (${latitude}, ${longitude})`
  );

  // First try: Standard request with shorter timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      {
        headers: {
          "User-Agent": "Lomu-dating-App/1.0 (lomuotieno@gmail.com)",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      const locationName =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        data.address?.state ||
        "Unknown Location";

      setCachedLocation(latitude, longitude, locationName);
      return locationName;
    }
  } catch (error) {
    console.log(`First attempt failed: ${error.message}`);
  }

  // Second try: Alternative approach with even shorter timeout
  try {
    const alternativeResult = await tryAlternativeGeocoding(
      latitude,
      longitude
    );
    if (alternativeResult) {
      setCachedLocation(latitude, longitude, alternativeResult);
      return alternativeResult;
    }
  } catch (error) {
    console.log(`Alternative approach also failed: ${error.message}`);
  }

  // Final fallback: Use offline reverse geocoding for known areas
  const offlineLocation = getOfflineLocationName(latitude, longitude);
  setCachedLocation(latitude, longitude, offlineLocation);
  return offlineLocation;
}

// Simple offline reverse geocoding for common areas
function getOfflineLocationName(lat, lon) {
  // Kenya regions approximation
  const regions = [
    { name: "Nairobi", lat: -1.286389, lon: 36.817223, radius: 0.5 },
    { name: "Kisumu", lat: -0.10221, lon: 34.76171, radius: 0.3 },
    { name: "Mombasa", lat: -4.0435, lon: 39.6682, radius: 0.4 },
    { name: "Nakuru", lat: -0.303099, lon: 36.080025, radius: 0.3 },
  ];

  for (const region of regions) {
    const distance = Math.sqrt(
      Math.pow(lat - region.lat, 2) + Math.pow(lon - region.lon, 2)
    );
    if (distance < region.radius) {
      return region.name;
    }
  }

  // If coordinates are in Kenya but not near major cities
  if (lat > -4.9 && lat < 5.0 && lon > 33.0 && lon < 42.0) {
    return "Kenya Region";
  }

  return "Unknown Location";
}
