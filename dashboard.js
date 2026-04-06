const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

document.querySelector(".nav-right span").textContent = "Welcome, " + user.name + "!";
document.getElementById("credits").textContent = user.plan === "pro" ? "Unlimited" : user.credits;

const generateBtn = document.getElementById("generateBtn");
const promptInput = document.getElementById("promptInput");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const imageResult = document.getElementById("imageResult");

// ===== SWITCH TABS =====
function switchTab(tab) {
  document.getElementById("imageTab").classList.toggle("active", tab === "image");
  document.getElementById("videoTab").classList.toggle("active", tab === "video");

  if (tab === "image") {
    document.getElementById("imageSection").style.display = "block";
    document.getElementById("videoSection").style.display = "none";
    document.getElementById("outputTitle").textContent = "Your Image";
    document.getElementById("emptyIcon").textContent = "🎨";
    emptyState.style.display = "block";
    loadingState.style.display = "none";
    imageResult.style.display = "none";
  } else {
    document.getElementById("imageSection").style.display = "none";
    document.getElementById("videoSection").style.display = "block";
    document.getElementById("outputTitle").textContent = "Coming Soon";
    document.getElementById("emptyIcon").textContent = "🎬";
    emptyState.style.display = "block";
    loadingState.style.display = "none";
    imageResult.style.display = "none";
  }
}

// ===== GENERATE IMAGE =====
generateBtn.addEventListener("click", async function() {
  const prompt = promptInput.value.trim();

  if (prompt === "") {
    alert("Please type a prompt first!");
    return;
  }

  if (user.plan === "free" && user.credits <= 0) {
    alert("Free images used! Upgrade to unlimited for just ₹9/month!");
    window.location.href = "pricing.html";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  emptyState.style.display = "none";
  imageResult.style.display = "none";
  loadingState.style.display = "block";

  try {
    const response = await fetch("https://videoai-backend-j5k9.onrender.com/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, token })
    });

    const data = await response.json();

    if (data.success) {
      loadingState.style.display = "none";
      imageResult.style.display = "block";
      document.getElementById("imageOutput").src = data.imageUrl;

      document.getElementById("downloadImageBtn").onclick = function() {
        const a = document.createElement("a");
        a.href = data.imageUrl;
        a.download = "imageai-" + Date.now() + ".jpg";
        a.click();
      };

      if (user.plan === "free") {
        user.credits = data.creditsLeft;
        localStorage.setItem("user", JSON.stringify(user));
        document.getElementById("credits").textContent = data.creditsLeft;
      }

      addToHistory(prompt, data.imageUrl);

    } else {
      loadingState.style.display = "none";
      emptyState.style.display = "block";
      alert(data.message);
    }

  } catch (error) {
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    alert("Something went wrong. Please try again!");
  }

  generateBtn.disabled = false;
  generateBtn.textContent = "⚡ Generate Image";
});

// ===== HISTORY =====
function addToHistory(prompt, imageUrl) {
  const historyGrid = document.getElementById("historyGrid");
  historyGrid.innerHTML = "";
  const card = document.createElement("div");
  card.className = "history-card";
  card.innerHTML = `
    <div class="history-thumbnail">
      <img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
    </div>
    <p>${prompt.substring(0, 30)}...</p>
    <span>🎨 Image • Just now</span>
  `;
  historyGrid.appendChild(card);
}

document.getElementById("buyCreditsBtn").addEventListener("click", function() {
  window.location.href = "pricing.html";
});

document.querySelector(".logout-btn").addEventListener("click", function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});