let lastLocationUpdate = null;

const updateLocationIfNeeded = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.warn("Location permission denied");
    return;
  }

  const location = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = location.coords;

  // Optional: implement threshold logic to skip small changes
  const last = lastLocationUpdate;
  const now = Date.now();

  if (last && now - last.time < 5 * 60 * 1000) {
    // Skip update if it's been < 5 minutes
    console.log("Skipping location update — too soon");
    return;
  }

  const token = await AsyncStorage.getItem("token");

  try {
    await axios.put(
      `${SERVER_URL}/api/users/location`,
      { latitude, longitude },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    lastLocationUpdate = { latitude, longitude, time: now };
    console.log("Location updated");
  } catch (error) {
    console.error(
      "Location update failed:",
      error.response?.data || error.message
    );
  }
};
