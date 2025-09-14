// API endpoint for register
const REGISTER_URL =
  "https://lomu-dating-backend.onrender.com/api/auth/register";

const registerBtn = document.getElementById("registerBtn");
const splash = document.getElementById("splash");

registerBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Missing Fields: Please enter all fields.");
    return;
  }

  splash.classList.remove("hidden"); // Show loading screen

  try {
    const response = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Something went wrong");
    }

    const data = await response.json();

    // Store token & user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userId", data.user.id);

    // alert("Registration successful! Redirecting to main page...");
    window.location.href = "gender.html"; // after registration redirect
  } catch (error) {
    console.error("Register error:", error.message);
    alert("Register Failed: " + error.message);
  } finally {
    splash.classList.add("hidden"); // Hide loader
  }
});

// Link back to login
document.getElementById("loginLink").addEventListener("click", () => {
  window.location.href = "loginScreen.html"; // login page
});
