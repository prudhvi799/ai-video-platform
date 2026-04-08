// ===== START FOR FREE BUTTON =====
document.getElementById("startBtn").addEventListener("click", function() {
  window.location.href = "signup.html";
});

// ===== LOGIN BUTTON =====
document.getElementById("loginBtn").addEventListener("click", function() {
  window.location.href = "login.html";
});

// ===== SIGNUP BUTTON =====
document.getElementById("signupBtn").addEventListener("click", function() {
  window.location.href = "signup.html";
});

// ===== FADE IN HERO HEADING =====
const heroHeading = document.querySelector(".hero h1");
if (heroHeading) {
  window.addEventListener("load", function() {
    setTimeout(function() {
      heroHeading.style.opacity = "1";
    }, 300);
  });
}