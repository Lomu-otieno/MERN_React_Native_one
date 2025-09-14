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
    window.location.href = "main.html"; // <-- redirect after login
  } catch (error) {
    console.error("Login error:", error.message);
    alert("Login Failed: " + error.message);
  } finally {
    splash.classList.add("hidden"); // Hide loading screen
  }
});

// Links (demo actions)
document.getElementById("registerLink").addEventListener("click", () => {
  alert("Navigate to Register Page");
});

document.getElementById("forgotLink").addEventListener("click", () => {
  alert("Navigate to Forgot Password Page");
});
