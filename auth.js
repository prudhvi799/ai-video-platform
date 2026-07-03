const API = "https://videoai-backend-j5k9.onrender.com";

const isLoginPage = document.getElementById("loginBtn");
const isSignupPage = document.getElementById("signupBtn");


// ===== LOGIN =====
if (isLoginPage) {

  document.getElementById("loginBtn").addEventListener("click", async function() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorBox = document.getElementById("loginError");

    if (email === "" || password === "") {
      errorBox.textContent = "Please fill in all fields.";
      return;
    }

    const btn = document.getElementById("loginBtn");
    btn.textContent = "Logging in...";
    btn.disabled = true;

    try {
      const response = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
      } else {
        errorBox.textContent = data.message;
        btn.textContent = "Login to VideoAI";
        btn.disabled = false;
      }
    } catch (e) {
      errorBox.textContent = "Network error. Please try again later.";
      btn.textContent = "Login to VideoAI";
      btn.disabled = false;
    }
  });

}


// ===== SIGNUP =====
if (isSignupPage) {

  document.getElementById("signupBtn").addEventListener("click", async function() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const confirm = document.getElementById("signupConfirm").value.trim();
    const errorBox = document.getElementById("signupError");

    if (name === "" || email === "" || password === "" || confirm === "") {
      errorBox.textContent = "Please fill in all fields.";
      return;
    }
    if (!email.includes("@")) {
      errorBox.textContent = "Please enter a valid email.";
      return;
    }
    if (password.length < 6) {
      errorBox.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (password !== confirm) {
      errorBox.textContent = "Passwords do not match!";
      return;
    }
    const btn = document.getElementById("signupBtn");
    btn.textContent = "Creating account...";
    btn.disabled = true;
    try {
      const response = await fetch(API + "/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
      } else {
        errorBox.textContent = data.message;
        btn.textContent = "Create Free Account";
        btn.disabled = false;
      }
    } catch (e) {
      errorBox.textContent = "Network error. Please try again later.";
      btn.textContent = "Create Free Account";
      btn.disabled = false;
    }
  });

}