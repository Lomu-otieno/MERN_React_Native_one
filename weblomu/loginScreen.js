const LOGIN_URL = "https://lomu-dating-backend.onrender.com/api/auth/login";

const loginBtn = document.getElementById("loginBtn");
const splash = document.getElementById("splash");

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Missing Fields: Please enter all fields.");
    return;
  }

  splash.classList.remove("hidden"); // Show loading screen

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Something went wrong");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userId", data.user.id);

    alert("Login Successful! Redirecting...");
    window.location.href = "explore.html"; // <-- redirect after login
  } catch (error) {
    console.error("Login error:", error.message);
    alert("Login Failed: " + error.message);
  } finally {
    splash.classList.add("hidden"); // Hide loading screen
  }
});

// Navigate to Register Page
document.getElementById("registerLink").addEventListener("click", () => {
  window.location.href = "register.html";
});

// Navigate to Forgot Password Page
document.getElementById("forgotLink").addEventListener("click", () => {
  window.location.href = "forgotPassword.html";
});

function updateLocation() {
  console.log("Hello World!");
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          "https://lomu-dating-backend.onrender.com/api/users/location",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
          }
        );

        const data = await res.json();

        if (res.ok) {
          console.log("✅ Location updated:", data);
          alert(`Location updated: ${data.locationName}`);
        } else {
          console.error("❌ Error:", data);
          alert("Failed to update location: " + data.message);
        }
      } catch (err) {
        console.error("❌ Request failed:", err);
        alert("Something went wrong while updating location");
      }
    },
    (error) => {
      console.error("❌ Geolocation error:", error);
      alert("Unable to retrieve your location");
    }
  );
}
