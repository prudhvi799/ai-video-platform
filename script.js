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


// ===== SUBSCRIBE BUTTONS =====
const subscribeButtons = document.querySelectorAll(".pricing-card button");
subscribeButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    window.location.href = "signup.html";
  });
});


// ===== FADE IN EFFECT =====
const heroHeading = document.querySelector(".hero h1");
heroHeading.style.opacity = "0";
heroHeading.style.transition = "opacity 1.5s ease";
window.addEventListener("load", function() {
  setTimeout(function() {
    heroHeading.style.opacity = "1";
  }, 300);
});