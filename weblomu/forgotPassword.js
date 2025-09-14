const FORGOT_URL =
  "https://lomu-dating-backend.onrender.com/api/auth/forgot-password";

const forgotBtn = document.getElementById("forgotBtn");
const splash = document.getElementById("splash");

forgotBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  splash.classList.remove("hidden"); // Show loader

  try {
    const response = await fetch(FORGOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Something went wrong");
    }

    const data = await response.json();
    alert(data.message || "Password reset link sent to your email.");
    window.location.href = "loginScreen.html"; // back to login
  } catch (error) {
    console.error("Forgot password error:", error.message);
    alert("Error: " + error.message);
  } finally {
    splash.classList.add("hidden");
  }
});

// Back to login
document.getElementById("loginLink").addEventListener("click", () => {
  window.location.href = "loginScreen.html";
});
