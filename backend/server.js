const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { fal } = require("@fal-ai/client");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ===== SUPABASE =====
const supabase = createClient(
  "https://iryznnsgpkcyembmpgaw.supabase.co",
  "sb_secret_uGxm27tzRyoJl1ev4JY7Ew_hdMuwefp"
);

// ===== FAL AI =====
fal.config({
  credentials: "fe8e6d26-486c-49ff-b816-e46c0708cf0c:301e22416aaa23f4f048726c3dde5346"
});

// ===== RAZORPAY =====
const razorpay = new Razorpay({
  key_id: "rzp_test_SYcOA5M3L1juZZ",
  key_secret: "lHRlL79Ejt8CxfmTYGZRfG3M"
});

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "videoai_secret_123";


// ===== TEST ROUTE =====
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
      credits: 0
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
    user: { name, email, plan: "free", credits: 0 }
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


// ===== GENERATE VIDEO =====
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

  if (user.credits <= 0) {
    return res.json({
      success: false,
      message: "No videos remaining! Please buy a credit pack."
    });
  }

  try {
    console.log("Generating video for:", prompt);

    const result = await fal.subscribe("fal-ai/wan/v2.2/t2v", {
      input: {
        prompt: prompt,
        num_frames: 81,
        resolution: "720p",
        aspect_ratio: "16:9"
      }
    });

    await supabase
      .from("users")
      .update({ credits: user.credits - 1 })
      .eq("id", user.id);

    res.json({
      success: true,
      videoUrl: result.data.video.url,
      creditsLeft: user.credits - 1
    });

  } catch (error) {
    console.error("Video generation error:", error);
    res.json({ success: false, message: "Video generation failed. Try again." });
  }
});


// ===== CREATE PAYMENT ORDER =====
app.post("/create-order", async function(req, res) {
  const { amount, pack, token } = req.body;

  // Verify user
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session. Please login again." });
  }

  // Create Razorpay order
  const order = await razorpay.orders.create({
    amount: amount * 100, // Razorpay needs paise (multiply by 100)
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

  // Verify user
  let userData;
  try {
    userData = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.json({ success: false, message: "Invalid session." });
  }

  // Verify payment signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", "lHRlL79Ejt8CxfmTYGZRfG3M")
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.json({ success: false, message: "Payment verification failed!" });
  }

  // Add credits based on pack
  const packCredits = {
    starter: 5,
    popular: 15,
    pro: 35
  };

  const creditsToAdd = packCredits[pack] || 0;

  // Get current user credits
  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userData.userId)
    .single();

  // Update credits
  const newCredits = user.credits + creditsToAdd;
  await supabase
    .from("users")
    .update({ credits: newCredits })
    .eq("id", userData.userId);

  res.json({
    success: true,
    message: "Payment successful! Credits added.",
    newCredits: newCredits
  });
});


// ===== START SERVER =====
const PORT = 3000;
app.listen(PORT, function() {
  console.log("Server is running on http://localhost:3000");
});