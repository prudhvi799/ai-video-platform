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
  key_id: "rzp_test_SYcOA5M3L1juZZ",
  key_secret: "lHRlL79Ejt8CxfmTYGZRfG3M"
});

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "videoai_secret_123";

app.get("/", function(req, res) {
  res.send("ImageAI Backend is running!");
});

// ===== SIGNUP =====
app.post("/signup", async function(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("email")
    .eq("email", email)
    .single();

  if (existingUser) {
    return res.json({ success: false, message: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{
      name: name,
      email: email,
      password: hashedPassword,
      plan: "free",
      credits: 3
    }])
    .select()
    .single();

  if (error) {
    return res.json({ success: false, message: "Error creating account" });
  }

  const token = jwt.sign({ userId: data.id, email: email }, SECRET_KEY);

  res.json({
    success: true,
    message: "Account created!",
    token: token,
    user: { name, email, plan: "free", credits: 3 }
  });
});

// ===== LOGIN =====
app.post("/login", async function(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (!user) {
    return res.json({ success: false, message: "Email not found" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.json({ success: false, message: "Wrong password" });
  }

  const token = jwt.sign({ userId: user.id, email: email }, SECRET_KEY);

  res.json({
    success: true,
    message: "Login successful!",
    token: token,
    user: {
      name: user.name,
      email: user.email,
      plan: user.plan,
      credits: user.credits
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
    .from("users")
    .select("*")
    .eq("id", userData.userId)
    .single();

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  // Check credits for free plan
  if (user.plan === "free" && user.credits <= 0) {
    return res.json({
      success: false,
      message: "Free images used! Please subscribe for ₹9/month for unlimited images."
    });
  }

  // Generate image using Pollinations AI (free!)
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

  // Deduct credit only for free plan
  if (user.plan === "free") {
    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("id", user.id);
  }

  res.json({
    success: true,
    imageUrl: imageUrl,
    creditsLeft: user.plan === "free" ? user.credits - 1 : 999
  });
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

  res.json({
    success: true,
    orderId: order.id,
    amount: amount,
    pack: pack
  });
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
    .createHmac("sha256", "lHRlL79Ejt8CxfmTYGZRfG3M")
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.json({ success: false, message: "Payment verification failed!" });
  }

  // Upgrade user to pro plan with unlimited images
  await supabase
    .from("users")
    .update({ plan: "pro", credits: 999 })
    .eq("id", userData.userId);

  res.json({
    success: true,
    message: "Payment successful! Unlimited images activated!",
    newCredits: 999,
    plan: "pro"
  });
});

const PORT = 3000;
app.listen(PORT, function() {
  console.log("Server is running on http://localhost:3000");
});