// utils/geolocation.js
import fetch from "node-fetch";

export async function getLocationName(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "lomu/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data = await response.json();

  return (
    data.address?.city ||
    data.address?.town ||
    data.address?.village ||
    data.display_name
  );
}
