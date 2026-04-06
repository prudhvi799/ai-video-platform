const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

document.querySelector(".nav-right span").textContent = "Welcome, " + user.name + "!";
document.getElementById("credits").textContent = user.credits;

const generateBtn = document.getElementById("generateBtn");
const promptInput = document.getElementById("promptInput");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const resultState = document.getElementById("resultState");

generateBtn.addEventListener("click", async function() {

  const prompt = promptInput.value.trim();

  if (prompt === "") {
    alert("Please type a prompt first!");
    return;
  }

  if (user.credits <= 0) {
    alert("No videos remaining! Please buy a credit pack.");
    window.location.href = "pricing.html";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  emptyState.style.display = "none";
  resultState.style.display = "none";
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
      resultState.style.display = "block";

      const videoPlayer = document.getElementById("videoPlayer");
      videoPlayer.src = data.videoUrl;
      videoPlayer.load();
      videoPlayer.play();

      user.credits = data.creditsLeft;
      localStorage.setItem("user", JSON.stringify(user));
      document.getElementById("credits").textContent = data.creditsLeft;

      addToHistory(prompt);

    } else {
      loadingState.style.display = "none";
      emptyState.style.display = "block";
      alert(data.message);
    }

  } catch (error) {
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    alert("Something went wrong. Make sure server is running!");
  }

  generateBtn.disabled = false;
  generateBtn.textContent = "⚡ Generate Video";

});

function addToHistory(prompt) {
  const historyGrid = document.getElementById("historyGrid");
  historyGrid.innerHTML = "";
  const card = document.createElement("div");
  card.className = "history-card";
  card.innerHTML = `
    <div class="history-thumbnail">🎬</div>
    <p>${prompt.substring(0, 30)}...</p>
    <span>Just now</span>
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