const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  window.location.href = "login.html";
}

// Show user credits
const creditsEl = document.getElementById("userCredits");
if (user.plan === "video_pro") {
  creditsEl.textContent = "🎬 Video Plan Active";
} else if (user.plan === "image_pro") {
  creditsEl.textContent = "🎨 Image Plan Active";
} else {
  creditsEl.textContent = user.credits + " images remaining";
}

document.querySelector(".logout-btn").addEventListener("click", function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

// ===== BUY PACK =====
async function buyPack(pack, amount) {
  try {
    // Create order
    const orderRes = await fetch("https://videoai-backend-j5k9.onrender.com/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, pack, token })
    });

    const orderData = await orderRes.json();

    if (!orderData.success) {
      alert("Error creating order. Please try again!");
      return;
    }

    // Open Razorpay
    const options = {
      key: "rzp_live_Sa7HKNvKWrLneT",
      amount: amount * 100,
      currency: "INR",
      name: "VideoAI",
      description: pack === "image"
        ? "Unlimited Images — ₹9/month"
        : pack === "video_monthly"
        ? "Images + Videos — ₹69/month"
        : "Images + Videos — ₹99 for 2 months",
      order_id: orderData.orderId,
      handler: async function(response) {
        // Verify payment
        const verifyRes = await fetch("https://videoai-backend-j5k9.onrender.com/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            pack,
            token
          })
        });

        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          // Update localStorage
          user.plan = verifyData.plan;
          user.credits = verifyData.newCredits;
          localStorage.setItem("user", JSON.stringify(user));

          if (pack === "image") {
            alert("✅ Subscribed! Unlimited images activated!");
          } else {
            alert("✅ Subscribed! Unlimited images AND videos activated!");
          }

          window.location.href = "dashboard.html";
        } else {
          alert("Payment verification failed. Contact support!");
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

  } catch (error) {
    alert("Something went wrong. Please try again!");
  }
}