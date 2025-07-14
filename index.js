const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { type } = require("os");
require("dotenv").config();
const PORT = process.env.PORT;
databaseConnect();

app.use(express.json());

async function databaseConnect() {
  const connectionString = process.env.CONNECTION_STRING;
  await mongoose.connect(connectionString);
  console.log("Database connected.");
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

app.post("/register", async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    //checks if users exists
    const user = await User.findOne({ email });

    if (user) {
      return res.status(401).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedpassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedpassword });
    await newUser.save();

    return res.json({
      success: true,
      message: "User registered successfully.",
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      res.status(500).json({
        success: false,
        message: err.message,
        stack: err.stack,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later.",
      });
    }
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    //checks if users exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User dosen't exist",
      });
    }

    const hashedPassword = user.password;
    const verifiedPassword = await bcrypt.compare(password, hashedPassword);

    if (!verifiedPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect credentials. Please try again.",
      });
    }
    const payload = {
      userId: user._id,
      email: user.email,
      role: "Student",
    };
    const token = jwt.sign(payload, process.env.JSON_WEBTOKEN_SECRET);
    return res.json({
      success: true,
      message: "Logged in",
      token,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      res.status(500).json({
        success: false,
        message: err.message,
        stack: err.stack,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later.",
      });
    }
  }
});

app.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const verifiedToken = jwt.verify(
      authHeader,
      process.env.JSON_WEBTOKEN_SECRET
    );

    if (!verifiedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing token. Please log in again.",
      });
    }

    const userId = verifiedToken.userId;

    const user = await User.findById({ _id: userId });
    res.json({ success: true, user });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      res.status(500).json({
        success: false,
        message: err.message,
        stack: err.stack,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later.",
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on PORT:${PORT}`);
});
