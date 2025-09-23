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
    { name: "Mombasa", lat: -4.0435, lon: 39.6682, radius: 0.3 },
    { name: "Kwale", lat: -4.1737, lon: 39.4521, radius: 0.4 },
    { name: "Kilifi", lat: -3.5107, lon: 39.9093, radius: 0.5 },
    { name: "Tana River", lat: -1.4999, lon: 40.0166, radius: 0.8 },
    { name: "Lamu", lat: -2.2696, lon: 40.9006, radius: 0.4 },
    { name: "Taita-Taveta", lat: -3.3961, lon: 38.5569, radius: 0.6 },
    { name: "Garissa", lat: -0.4536, lon: 39.6461, radius: 0.7 },
    { name: "Wajir", lat: 1.7488, lon: 40.0586, radius: 0.9 },
    { name: "Mandera", lat: 3.9366, lon: 41.8675, radius: 1.0 },
    { name: "Marsabit", lat: 2.334, lon: 37.9909, radius: 1.2 },
    { name: "Isiolo", lat: 0.3556, lon: 37.5833, radius: 0.7 },
    { name: "Meru", lat: 0.0515, lon: 37.6456, radius: 0.6 },
    { name: "Tharaka-Nithi", lat: -0.2966, lon: 37.8174, radius: 0.4 },
    { name: "Embu", lat: -0.539, lon: 37.4574, radius: 0.4 },
    { name: "Kitui", lat: -1.367, lon: 38.0106, radius: 0.7 },
    { name: "Machakos", lat: -1.5177, lon: 37.2634, radius: 0.5 },
    { name: "Makueni", lat: -2.2774, lon: 37.8227, radius: 0.6 },
    { name: "Nyandarua", lat: -0.5325, lon: 36.9564, radius: 0.6 },
    { name: "Nyeri", lat: -0.4201, lon: 36.9476, radius: 0.5 },
    { name: "Kirinyaga", lat: -0.4993, lon: 37.2801, radius: 0.4 },
    { name: "Murang'a", lat: -0.7833, lon: 37.0333, radius: 0.5 },
    { name: "Kiambu", lat: -1.1713, lon: 36.8355, radius: 0.5 },
    { name: "Turkana", lat: 3.1158, lon: 35.5978, radius: 1.5 },
    { name: "West Pokot", lat: 1.2389, lon: 35.1119, radius: 0.8 },
    { name: "Samburu", lat: 1.0986, lon: 36.6981, radius: 0.9 },
    { name: "Trans Nzoia", lat: 1.0467, lon: 34.95, radius: 0.5 },
    { name: "Uasin Gishu", lat: 0.5143, lon: 35.2698, radius: 0.4 },
    { name: "Elgeyo-Marakwet", lat: 0.8076, lon: 35.5609, radius: 0.6 },
    { name: "Nandi", lat: 0.1833, lon: 35.1, radius: 0.5 },
    { name: "Baringo", lat: 0.4667, lon: 35.9667, radius: 0.7 },
    { name: "Laikipia", lat: 0.2069, lon: 36.5222, radius: 0.8 },
    { name: "Nakuru", lat: -0.3031, lon: 36.08, radius: 0.5 },
    { name: "Narok", lat: -1.0833, lon: 35.8667, radius: 0.8 },
    { name: "Kajiado", lat: -1.8524, lon: 36.7767, radius: 0.8 },
    { name: "Kericho", lat: -0.3676, lon: 35.2836, radius: 0.5 },
    { name: "Bomet", lat: -0.781, lon: 35.3416, radius: 0.5 },
    { name: "Kakamega", lat: 0.2827, lon: 34.7519, radius: 0.4 },
    { name: "Vihiga", lat: 0.0769, lon: 34.7261, radius: 0.3 },
    { name: "Bungoma", lat: 0.5695, lon: 34.5584, radius: 0.5 },
    { name: "Busia", lat: 0.46, lon: 34.1117, radius: 0.4 },
    { name: "Siaya", lat: 0.0624, lon: 34.2881, radius: 0.5 },
    { name: "Kisumu", lat: -0.1022, lon: 34.7617, radius: 0.3 },
    { name: "Homa Bay", lat: -0.536, lon: 34.45, radius: 0.6 },
    { name: "Migori", lat: -1.0667, lon: 34.4667, radius: 0.6 },
    { name: "Kisii", lat: -0.6833, lon: 34.7667, radius: 0.4 },
    { name: "Nyamira", lat: -0.5667, lon: 34.95, radius: 0.4 },
    { name: "Nairobi", lat: -1.2864, lon: 36.8172, radius: 0.4 },
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
