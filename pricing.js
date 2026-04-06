const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

document.getElementById("userCredits").textContent = user.credits + " videos remaining";

document.querySelector(".logout-btn").addEventListener("click", function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});


// ===== BUY PACK FUNCTION =====
async function buyPack(packName, price, videos) {

  // Step 1 — Create order on backend
  const response = await fetch("https://videoai-backend-j5k9.onrender.com/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: price,
      pack: packName,
      token: token
    })
  });

  const order = await response.json();

  if (!order.success) {
    alert("Error creating order. Please try again.");
    return;
  }

  // Step 2 — Open Razorpay payment popup
  const options = {
    key: "rzp_test_SYcOA5M3L1juZZ",
    amount: price * 100,
    currency: "INR",
    name: "VideoAI",
    description: packName + " Pack - " + videos + " videos",
    order_id: order.orderId,
    handler: async function(response) {

      // Step 3 — Verify payment on backend
      const verifyResponse = await fetch("https://videoai-backend-j5k9.onrender.com/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          pack: packName,
          token: token
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        user.credits = verifyData.newCredits;
        localStorage.setItem("user", JSON.stringify(user));
        alert("Payment successful! " + videos + " videos added to your account!");
        window.location.href = "dashboard.html";
      } else {
        alert("Payment verification failed. Contact support.");
      }

    },
    prefill: {
      name: user.name,
      email: user.email
    },
    theme: {
      color: "#a855f7"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}