const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

document.querySelector(".nav-right span").textContent = "Welcome, " + user.name + "!";

// Show correct credits based on plan
const creditsEl = document.getElementById("credits");
if (user.plan === "video_pro") {
  creditsEl.textContent = "Unlimited";
} else if (user.plan === "image_pro") {
  creditsEl.textContent = "Unlimited";
} else {
  creditsEl.textContent = user.credits;
}

// Show correct upgrade button text
const buyBtn = document.getElementById("buyCreditsBtn");
if (user.plan === "free") {
  buyBtn.textContent = "⭐ Upgrade — ₹9/month images or ₹69/month with videos";
} else if (user.plan === "image_pro") {
  buyBtn.textContent = "🎬 Upgrade to Videos Plan — ₹69/month";
} else {
  buyBtn.style.display = "none";
}

const generateBtn = document.getElementById("generateBtn");
const generateVideoBtn = document.getElementById("generateVideoBtn");
const promptInput = document.getElementById("promptInput");
const videoPromptInput = document.getElementById("videoPromptInput");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const imageResult = document.getElementById("imageResult");
const videoResult = document.getElementById("videoResult");

// ===== SWITCH TABS =====
function switchTab(tab) {
  document.getElementById("imageTab").classList.toggle("active", tab === "image");
  document.getElementById("videoTab").classList.toggle("active", tab === "video");

  emptyState.style.display = "block";
  loadingState.style.display = "none";
  imageResult.style.display = "none";
  videoResult.style.display = "none";

  if (tab === "image") {
    document.getElementById("imageSection").style.display = "block";
    document.getElementById("videoSection").style.display = "none";
    document.getElementById("outputTitle").textContent = "Your Image";
    document.getElementById("historyTitle").textContent = "Your Recent Images";
    document.getElementById("emptyIcon").textContent = "🎨";
  } else {
    document.getElementById("imageSection").style.display = "none";
    document.getElementById("videoSection").style.display = "block";
    document.getElementById("outputTitle").textContent = "Your Video";
    document.getElementById("historyTitle").textContent = "Your Recent Videos";
    document.getElementById("emptyIcon").textContent = "🎬";

    if (user.plan === "video_pro") {
      document.getElementById("videoLockBox").style.display = "none";
      document.getElementById("videoGenerateBox").style.display = "block";
    } else {
      document.getElementById("videoLockBox").style.display = "block";
      document.getElementById("videoGenerateBox").style.display = "none";
    }
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
  videoResult.style.display = "none";
  loadingState.style.display = "block";
  document.getElementById("loadingText").textContent = "Generating your image...";

  try {
    const response = await fetch("https://videoai-backend-j5k9.onrender.com/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        token,
        image: attachedImageBase64   // ✅ ADDED HERE
      })
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

      addToHistory(prompt, data.imageUrl, "image");

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

// ===== GENERATE VIDEO =====
generateVideoBtn.addEventListener("click", async function() {
  const prompt = videoPromptInput.value.trim();

  if (prompt === "") {
    alert("Please type a prompt first!");
    return;
  }

  generateVideoBtn.disabled = true;
  generateVideoBtn.textContent = "Generating... (1-3 mins)";
  emptyState.style.display = "none";
  imageResult.style.display = "none";
  videoResult.style.display = "none";
  loadingState.style.display = "block";
  document.getElementById("loadingText").textContent = "Generating your video...";

  try {
    const response = await fetch("https://videoai-backend-j5k9.onrender.com/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, token })
    });

    const data = await response.json();

    if (data.success) {
      loadingState.style.display = "none";
      videoResult.style.display = "block";

      const videoOutput = document.getElementById("videoOutput");
      videoOutput.src = data.videoUrl;
      videoOutput.load();
      videoOutput.play();

      document.getElementById("downloadVideoBtn").onclick = function() {
        const a = document.createElement("a");
        a.href = data.videoUrl;
        a.download = "videoai-" + Date.now() + ".mp4";
        a.click();
      };

      addToHistory(prompt, null, "video");

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

  generateVideoBtn.disabled = false;
  generateVideoBtn.textContent = "⚡ Generate Video";
});

// ===== HISTORY =====
function addToHistory(prompt, imageUrl, type) {
  const historyGrid = document.getElementById("historyGrid");
  historyGrid.innerHTML = "";
  const card = document.createElement("div");
  card.className = "history-card";
  card.innerHTML = `
    <div class="history-thumbnail">
      ${imageUrl
        ? `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;">🎬</div>`
      }
    </div>
    <p>${prompt.substring(0, 30)}...</p>
    <span>${type === "image" ? "🎨 Image" : "🎬 Video"} • Just now</span>
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


// ===== FILE ATTACH (ADDED AT BOTTOM) =====
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