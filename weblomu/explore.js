const SERVER_URL = "https://lomu-dating-backend.onrender.com";
const cardsContainer = document.getElementById("cards");
const loading = document.getElementById("loading");
const empty = document.getElementById("empty");
const messageBox = document.getElementById("message");

let users = [];
let currentIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let currentCard = null;

// Function to show message
function showMessage(msg) {
  messageBox.textContent = msg;
  messageBox.classList.remove("hidden");
  setTimeout(() => messageBox.classList.add("hidden"), 3000);
}

// Function to get the appropriate profile image
function getProfileImage(user) {
  if (
    user.profileImage &&
    typeof user.profileImage === "string" &&
    user.profileImage.trim() !== ""
  ) {
    return user.profileImage;
  }
  if (user.photos && user.photos.length > 0) {
    return user.photos[0];
  }
}

// Function to create user card HTML
function createUserCard(user, index, totalUsers) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.index = index;
  card.style.zIndex = totalUsers - index;
  card.style.transform =
    index === 0
      ? "none"
      : `scale(${1 - index * 0.05}) translateY(${index * 10}px)`;

  if (user.isPlaceholder) {
    card.innerHTML = `
            <div class="end-card">
                <i class="fas fa-check-circle"></i>
                <h2>You're all caught up!</h2>
                <p>Check back later for new people nearby.</p>
                <button id="refreshEndBtn">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;
  } else {
    const profileImage = getProfileImage(user);
    card.innerHTML = `
            <img src="${profileImage}" alt="${user.username}" 
                 " />
            <div class="card-overlay"></div>
            <div class="card-info">
                <h2>@${user.username}</h2>
                <div class="age">${
                  user.age ? user.age + " years" : "Age not specified"
                }</div>
                <p class="bio">${user.bio || "No bio yet"}</p>
                <div class="distance">
                    <i class="fas fa-location-dot"></i>
                    <span>${
                      user.distance
                        ? user.distance + " km away"
                        : "Distance unknown"
                    }</span>
                </div>
            </div>
            <div class="swipe-label swipe-right">LIKE</div>
            <div class="swipe-label swipe-left">PASS</div>
        `;
  }

  return card;
}

// Function to update card positions
function updateCardPositions() {
  const remainingCards = cardsContainer.querySelectorAll(".card");
  remainingCards.forEach((card, i) => {
    const index = parseInt(card.dataset.index);
    card.style.zIndex = remainingCards.length - i;
    if (i === remainingCards.length - 1) {
      card.style.transform = "none";
      setupSwipeEvents();
    } else {
      card.style.transform = `scale(${1 - i * 0.05}) translateY(${i * 10}px)`;
    }
  });
}

// Fetch users from API
async function fetchUsers() {
  loading.classList.remove("hidden");
  empty.classList.add("hidden");
  cardsContainer.innerHTML = "";
  currentIndex = 0;

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const res = await fetch(`${SERVER_URL}/api/users/explore`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) throw new Error("Failed to fetch users");

    users = await res.json();
    console.log("Fetched users:", users); // Debug log to check API response

    if (users.length === 0) {
      empty.classList.remove("hidden");
      return;
    }

    // Add end card
    users.push({ _id: "end", isPlaceholder: true });

    users.forEach((user, i) => {
      const card = createUserCard(user, i, users.length);
      cardsContainer.appendChild(card);
    });

    // Add event listeners for swipe on the top card
    if (users.length > 0) {
      setupSwipeEvents();
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
    showMessage("Failed to load users");
  } finally {
    loading.classList.add("hidden");
  }
}

// Setup swipe event listeners
function setupSwipeEvents() {
  currentCard = cardsContainer.querySelector(".card:last-child");
  if (!currentCard || currentCard.dataset.index != currentIndex) return;

  currentCard.addEventListener("mousedown", startDrag);
  currentCard.addEventListener("touchstart", startDrag, { passive: true });
}

// Handle drag start
function startDrag(e) {
  if (users[currentIndex].isPlaceholder) return;

  isDragging = true;
  startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;

  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: true });
  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);

  // Prevent text selection during drag
  e.preventDefault();
}

// Handle dragging
function drag(e) {
  if (!isDragging) return;

  currentX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  const deltaX = currentX - startX;

  // Move card
  currentCard.style.transform = `translateX(${deltaX}px) rotate(${
    deltaX * 0.1
  }deg)`;

  // Show swipe labels
  const likeLabel = currentCard.querySelector(".swipe-right");
  const passLabel = currentCard.querySelector(".swipe-left");

  if (deltaX > 50) {
    likeLabel.style.opacity = Math.min(deltaX / 100, 1);
    passLabel.style.opacity = 0;
  } else if (deltaX < -50) {
    passLabel.style.opacity = Math.min(Math.abs(deltaX) / 100, 1);
    likeLabel.style.opacity = 0;
  } else {
    likeLabel.style.opacity = 0;
    passLabel.style.opacity = 0;
  }
}

// Handle drag end
function endDrag() {
  if (!isDragging) return;

  isDragging = false;
  const deltaX = currentX - startX;

  document.removeEventListener("mousemove", drag);
  document.removeEventListener("touchmove", drag);
  document.removeEventListener("mouseup", endDrag);
  document.removeEventListener("touchend", endDrag);

  // Check if swipe distance is enough to trigger action
  if (deltaX > 100) {
    // Swipe right - Like
    handleAction("like");
  } else if (deltaX < -100) {
    // Swipe left - Pass
    handleAction("pass");
  } else {
    // Return to original position
    currentCard.style.transform = "";
    currentCard.querySelector(".swipe-right").style.opacity = 0;
    currentCard.querySelector(".swipe-left").style.opacity = 0;
  }
}

// Handle like/pass actions
async function handleAction(action) {
  if (currentIndex >= users.length || users[currentIndex].isPlaceholder) {
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

    showMessage(`${action === "like" ? "LIKED" : "PASSED"} @${user.username}`);

    // Animate current card out
    const oldCard = currentCard;
    oldCard.style.transform =
      action === "like"
        ? "translateX(1000px) rotate(30deg)"
        : "translateX(-1000px) rotate(-30deg)";
    oldCard.style.opacity = "0";

    // 👉 Advance index and reattach swipe immediately
    currentIndex++;
    updateCardPositions();

    // Remove the old card after the animation
    setTimeout(() => {
      if (oldCard && oldCard.parentNode) {
        oldCard.parentNode.removeChild(oldCard);
      }
      if (currentIndex >= users.length - 1) {
        empty.classList.remove("hidden");
      }
    }, 100);
  } catch (err) {
    console.error(`${action} error:`, err.message);
    showMessage(`Failed to ${action} user`);
    // Reset card if request failed
    currentCard.style.transform = "";
    currentCard.querySelector(".swipe-right").style.opacity = 0;
    currentCard.querySelector(".swipe-left").style.opacity = 0;
  }
}

// Event listeners
function setupEventListeners() {
  document.getElementById("likeBtn").addEventListener("click", () => {
    if (users[currentIndex] && !users[currentIndex].isPlaceholder) {
      handleAction("like");
    }
  });

  document.getElementById("passBtn").addEventListener("click", () => {
    if (users[currentIndex] && !users[currentIndex].isPlaceholder) {
      handleAction("pass");
    }
  });

  document.getElementById("refreshBtn").addEventListener("click", fetchUsers);

  document.addEventListener("click", function (e) {
    if (e.target.id === "refreshEndBtn") {
      fetchUsers();
    }
  });
}

// Initialize the app
function init() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  } else {
    setupEventListeners();
    fetchUsers();
  }
}

// Start the app when the page loads
window.addEventListener("load", init);
