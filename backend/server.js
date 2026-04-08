const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ===== SUPABASE =====
const supabase = createClient(
  "https://iryznnsgpkcyembmpgaw.supabase.co",
  "sb_secret_uGxm27tzRyoJl1ev4JY7Ew_hdMuwefp"
);

// ===== RAZORPAY =====
const razorpay = new Razorpay({
  key_id: "rzp_live_Sa7HKNvKWrLneT",
  key_secret: "Nui6gDAln9FN6xT4Gl26yYgT"
});

// ===== POLLINATIONS API KEY =====
const POLLINATIONS_KEY = "sk_DPzU5LmL4By8cDs5pFJGrnTH0rxC1DOu";

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "videoai_secret_123";

app.get("/", function(req, res) {
  res.send("VideoAI Backend is running!");
});

// ===== SIGNUP =====
app.post("/signup", async function(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }
  const { data: existingUser } = await supabase
    .from("users").select("email").eq("email", email).single();
  if (existingUser) {
    return res.json({ success: false, message: "Email already registered" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from("users")
    .insert([{
      name,
      email,
      password: hashedPassword,
      plan: "free",
      credits: 3,
      video_credits: 4
    }])
    .select().single();
  if (error) {
    return res.json({ success: false, message: "Error creating account" });
  }
  const token = jwt.sign({ userId: data.id, email }, SECRET_KEY);
  res.json({
    success: true,
    message: "Account created!",
    token,
    user: {
      name,
      email,
      plan: "free",
      credits: 3,
      video_credits: 4
    }
  });
});

// ===== LOGIN =====
app.post("/login", async function(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }
  const { data: user } = await supabase
    .from("users").select("*").eq("email", email).single();
  if (!user) {
    return res.json({ success: false, message: "Email not found" });
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.json({ success: false, message: "Wrong password" });
  }
  const token = jwt.sign({ userId: user.id, email }, SECRET_KEY);
  res.json({
    success: true,
    message: "Login successful!",
    token,
    user: {
      name: user.name,
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      video_credits: user.video_credits || 0
    }
  });
});

// ===== GENERATE IMAGE =====
app.post("/generate", async function(req, res) {
  const { prompt, token } = req.body;
  if (!prompt || !token) {
    return res.json({ success: false, message: "Prompt and token required" });
  }
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session. Please login again." });
  }
  const { data: user } = await supabase
    .from("users").select("*").eq("id", userData.userId).single();
  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }
  if (user.plan === "free" && user.credits <= 0) {
    return res.json({
      success: false,
      message: "Free images used! Subscribe ₹9/month for unlimited images."
    });
  }
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&key=${POLLINATIONS_KEY}`;
  if (user.plan === "free") {
    await supabase.from("users").update({ credits: user.credits - 1 }).eq("id", user.id);
  }
  res.json({
    success: true,
    imageUrl,
    creditsLeft: user.plan === "free" ? user.credits - 1 : 999
  });
});

// ===== GENERATE VIDEO =====
app.post("/generate-video", async function(req, res) {
  const { prompt, token } = req.body;
  if (!prompt || !token) {
    return res.json({ success: false, message: "Prompt and token required" });
  }
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session. Please login again." });
  }
  const { data: user } = await supabase
    .from("users").select("*").eq("id", userData.userId).single();
  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  // Check video access
  if (user.plan === "free") {
    // Free user — check video_credits
    if (!user.video_credits || user.video_credits <= 0) {
      return res.json({
        success: false,
        message: "Free videos used! Subscribe ₹69/month for unlimited videos.",
        upgradeRequired: true
      });
    }
  } else if (user.plan === "image_pro") {
    // Image only plan — no videos
    return res.json({
      success: false,
      message: "Video generation requires Video Plan! Subscribe ₹69/month for images + videos.",
      upgradeRequired: true
    });
  }
  // video_pro users — unlimited, no check needed

  try {
    // Pollinations video API
    const response = await fetch("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=1024&height=576&nologo=true&key=" + POLLINATIONS_KEY);

    if (response.ok) {
      const videoUrl = response.url;

      // Deduct free video credit if free user
      if (user.plan === "free") {
        await supabase
          .from("users")
          .update({ video_credits: user.video_credits - 1 })
          .eq("id", user.id);
      }

      res.json({
        success: true,
        videoUrl: videoUrl,
        videoCreditsLeft: user.plan === "free" ? user.video_credits - 1 : 999
      });
    } else {
      res.json({ success: false, message: "Video generation failed. Please try again!" });
    }

  } catch (error) {
    console.error("Video generation error:", error);
    res.json({ success: false, message: "Video generation failed. Please try again!" });
  }
});

// ===== CREATE PAYMENT ORDER =====
app.post("/create-order", async function(req, res) {
  const { amount, pack, token } = req.body;
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session. Please login again." });
  }
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: "order_" + Date.now()
  });
  res.json({ success: true, orderId: order.id, amount, pack });
});

// ===== VERIFY PAYMENT =====
app.post("/verify-payment", async function(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack, token } = req.body;
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session." });
  }
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", "Nui6gDAln9FN6xT4Gl26yYgT")
    .update(body).digest("hex");
  if (expectedSignature !== razorpay_signature) {
    return res.json({ success: false, message: "Payment verification failed!" });
  }

  if (pack === "service") {
    return res.json({
      success: true,
      message: "Payment for service verified successfully."
    });
  }

  let newPlan = "image_pro";
  let newCredits = 999;
  let newVideoCredits = 0;

  if (pack === "image") {
    newPlan = "image_pro";
    newCredits = 999;
    newVideoCredits = 0;
  } else if (pack === "video_monthly" || pack === "video_2months") {
    newPlan = "video_pro";
    newCredits = 999;
    newVideoCredits = 999;
  }

  await supabase
    .from("users")
    .update({ plan: newPlan, credits: newCredits, video_credits: newVideoCredits })
    .eq("id", userData.userId);

  res.json({
    success: true,
    message: "Payment successful!",
    newCredits,
    newVideoCredits,
    plan: newPlan
  });
});

const PORT = 3000;
app.listen(PORT, function() {
  console.log("Server is running on http://localhost:3000");
});