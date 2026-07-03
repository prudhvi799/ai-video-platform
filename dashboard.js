const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

// Redirect to login if not authenticated
if (!user || !token) {
  window.location.href = "login.html";
}

// ===== POPULATE USER INFO =====
document.getElementById("userName").textContent = user.name || "Creator";

const creditsDisplay = user.plan === "pro" ? "∞" : (user.credits || 0);
document.getElementById("creditsCount").textContent = creditsDisplay;
document.getElementById("credits").textContent = creditsDisplay;
document.getElementById("statCredits").textContent = creditsDisplay;
document.getElementById("statPlan").textContent = user.plan === "pro" ? "Pro ✨" : "Free";

// Hide upgrade button and strip for pro users
if (user.plan === "pro") {
  document.getElementById("upgradeBtn").style.display = "none";
  document.getElementById("upgradeStrip").style.display = "none";
  document.getElementById("buyCreditsBtn").style.display = "none";
}

// ===== GENERATE BUTTON =====
const generateBtn = document.getElementById("generateBtn");
const promptInput = document.getElementById("promptInput");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const imageResult = document.getElementById("imageResult");

generateBtn.addEventListener("click", async function () {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    alert("Please type a prompt first!");
    return;
  }

  if (user.plan === "free" && user.credits <= 0) {
    alert("You've used all free images! Upgrade to unlimited for just ₹9/month.");
    window.location.href = "pricing.html";
    return;
  }

  // Show loading
  generateBtn.disabled = true;
  document.getElementById("btnText").textContent = "⏳ Generating...";
  emptyState.style.display = "none";
  imageResult.style.display = "none";
  loadingState.style.display = "block";
  document.getElementById("loadingText").textContent = "Generating your image...";

  try {
    const response = await fetch("https://videoai-backend-j5k9.onrender.com/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, token, image: attachedImageBase64 })
    });

    const data = await response.json();

    if (data.success) {
      loadingState.style.display = "none";
      imageResult.style.display = "block";
      document.getElementById("imageResult").src = data.imageUrl;

      // Download button
      document.getElementById("downloadBtn").onclick = function () {
        const a = document.createElement("a");
        a.href = data.imageUrl;
        a.download = "videoai-" + Date.now() + ".jpg";
        a.click();
      };

      // Update credits for free users
      if (user.plan === "free") {
        user.credits = data.creditsLeft;
        localStorage.setItem("user", JSON.stringify(user));
        document.getElementById("credits").textContent = data.creditsLeft;
        document.getElementById("creditsCount").textContent = data.creditsLeft;
        document.getElementById("statCredits").textContent = data.creditsLeft;
      }

      addToHistory(prompt, data.imageUrl, "image");

    } else {
      loadingState.style.display = "none";
      emptyState.style.display = "block";
      alert(data.message || "Something went wrong. Please try again.");
    }

  } catch (error) {
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    alert("Network error. Please check your connection and try again.");
  }

  generateBtn.disabled = false;
  document.getElementById("btnText").textContent = "⚡ Generate Image";
});

// ===== ADD TO HISTORY =====
function addToHistory(prompt, imageUrl) {
  const historyGrid = document.getElementById("historyGrid");

  // Remove empty state
  const emptyMsg = historyGrid.querySelector(".history-empty");
  if (emptyMsg) emptyMsg.remove();

  const card = document.createElement("div");
  card.className = "history-card";
  card.innerHTML = `
    <div class="history-thumbnail">
      <img src="${imageUrl}" alt="Generated image" />
    </div>
    <p>${prompt.substring(0, 32)}${prompt.length > 32 ? "..." : ""}</p>
    <span>Just now</span>
  `;

  // Click to view full image
  card.addEventListener("click", function () {
    window.open(imageUrl, "_blank");
  });

  historyGrid.prepend(card);
}

// ===== BUY CREDITS =====
document.getElementById("buyCreditsBtn").addEventListener("click", function () {
  window.location.href = "pricing.html";
});

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

// ===== FILE ATTACH =====
let attachedImageBase64 = null;

function handleFileAttach(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    attachedImageBase64 = e.target.result;
    document.getElementById("attachedImagePreview").src = e.target.result;
    document.getElementById("imagePreviewBox").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function removeAttachedImage() {
  attachedImageBase64 = null;
  document.getElementById("attachedImagePreview").src = "";
  document.getElementById("imagePreviewBox").style.display = "none";
  document.getElementById("fileInput").value = "";
}