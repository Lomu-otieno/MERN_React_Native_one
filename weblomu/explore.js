const SERVER_URL = "https://lomu-dating-backend.onrender.com"; // change if local
const cardsContainer = document.getElementById("cards");
const loading = document.getElementById("loading");
const empty = document.getElementById("empty");
const messageBox = document.getElementById("message");

let users = [];
let currentIndex = 0;

function showMessage(msg) {
  messageBox.textContent = msg;
  messageBox.classList.remove("hidden");
  setTimeout(() => messageBox.classList.add("hidden"), 3000);
}

async function fetchUsers() {
  loading.classList.remove("hidden");
  empty.classList.add("hidden");
  cardsContainer.innerHTML = "";
  currentIndex = 0;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${SERVER_URL}/api/users/explore`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    users = await res.json();

    if (users.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    users.forEach((user, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.zIndex = users.length - i;

      card.innerHTML = `
        <img src="${user.profileImage || "https://i.imgur.com/5WzFNgi.jpg"}" />
        <div class="card-info">
          <h2>@${user.username}${user.age ? `, ${user.age}` : ""}</h2>
          <p>${user.bio || "No bio yet"}</p>
          <p style="color:#FF0050">
            ${user.distance ? user.distance + " km away" : "Distance unknown"}
          </p>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Fetch error:", err.message);
    showMessage("Failed to load users");
  } finally {
    loading.classList.add("hidden");
  }
}

async function handleAction(action) {
  if (currentIndex >= users.length) {
    showMessage("No more users");
    return;
  }

  const user = users[currentIndex];
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${SERVER_URL}/api/users/${action}/${user._id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Request failed");

    showMessage(`${action.toUpperCase()} @${user.username}`);

    // Animate and remove card
    const topCard = cardsContainer.querySelector(".card:last-child");
    if (topCard) {
      topCard.style.transform =
        action === "like" ? "translateX(100%)" : "translateX(-100%)";
      topCard.style.opacity = "0";
      setTimeout(() => topCard.remove(), 300);
    }

    currentIndex++;
    if (currentIndex >= users.length) {
      empty.classList.remove("hidden");
    }
  } catch (err) {
    console.error(`${action} error:`, err.message);
    showMessage(`Failed to ${action} user`);
  }
}

document
  .getElementById("likeBtn")
  .addEventListener("click", () => handleAction("like"));
document
  .getElementById("passBtn")
  .addEventListener("click", () => handleAction("pass"));
document.getElementById("refreshBtn").addEventListener("click", fetchUsers);

fetchUsers();
