const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

document.getElementById("userCredits").textContent = user.plan === "pro" ? "Unlimited" : user.credits + " images remaining";

document.querySelector(".logout-btn").addEventListener("click", function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

async function buyPack(packName, price) {
  const response = await fetch("https://videoai-backend-j5k9.onrender.com/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: price, pack: packName, token: token })
  });

  const order = await response.json();

  if (!order.success) {
    alert("Error creating order. Please try again.");
    return;
  }

  const options = {
    key: "rzp_test_SYcOA5M3L1juZZ",
    amount: price * 100,
    currency: "INR",
    name: "ImageAI",
    description: "Unlimited Images — ₹9/month",
    order_id: order.orderId,
    handler: async function(response) {
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
        user.plan = "pro";
        localStorage.setItem("user", JSON.stringify(user));
        alert("Payment successful! Unlimited images activated!");
        window.location.href = "dashboard.html";
      } else {
        alert("Payment verification failed. Contact support.");
      }
    },
    prefill: { name: user.name, email: user.email },
    theme: { color: "#a855f7" }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}