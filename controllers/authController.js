const User = require("../models/userModel");
const { loginSchema, registerSchema } = require("../schemas/authSchema");
const bcrypt = require("bcryptjs");
const sendError = require("../utils/sendError");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return sendError(res, 400, "Invalid input.");
  }

  const { name, email, password } = result.data;
  try {
    // 3. Check for existing user (409 Conflict)
    const user = await User.findOne({ email });

    if (user) {
      return sendError(res, 409, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    return res.json({
      success: true,
      message: "User registered successfully.",
    });
  } catch (err) {
    return sendError(res, 500, "Internal server error.", err);
  }
};

const login = async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, 400, "Invalid input.");
  }

  const { email, password } = result.data;
  try {
    //checks if users exists
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 401, "User doesn't exist");
    }

    const hashedPassword = user.password;
    const verifiedPassword = await bcrypt.compare(password, hashedPassword);

    if (!verifiedPassword) {
      return sendError(res, 401, "Incorrect credentials. Please try again.");
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
    return sendError(res, 500, "Internal server error.", err);
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, 401, "Token required. Please log in.");
    }

    let verifiedToken;
    try {
      verifiedToken = jwt.verify(authHeader, process.env.JSON_WEBTOKEN_SECRET);
    } catch (err) {
      return sendError(
        res,
        401,
        "Invalid or expired token. Please log in again."
      );
    }

    const userId = verifiedToken.userId;
    const user = await User.findById({ _id: userId });
    return res.json({ success: true, user });
  } catch (err) {
    return sendError(res, 500, "Internal server error.", err);
  }
};

module.exports = { login, register, me };
