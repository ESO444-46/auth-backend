const uuid = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/userModel");
const sendError = require("../utils/sendError");
const { loginSchema, registerSchema } = require("../schemas/authSchema");
const RefreshToken = require("../models/refreshTokenModel");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
    const accessToken = jwt.sign(payload, process.env.JSON_WEBTOKEN_SECRET, {
      expiresIn: "1m",
    });

    const refreshTokenString = uuid.v4();
    const hashedToken = hashToken(refreshTokenString);
    const expiryDate = 14 * 24 * 60 * 60 * 1000;
    const newRefreshToken = RefreshToken({
      userId: user._id,
      token: hashedToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiryDate),
      revoked: false,
    });

    await newRefreshToken.save();

    return res
      .cookie("refreshToken", hashedToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(Date.now() + expiryDate),
      })
      .json({
        success: true,
        message: "Logged in",
        accessToken,
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

// DRY VIOLATED
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return sendError(res, 401, "Unauthorized. Please login");
    }

    const verifiedToken = await RefreshToken.findOne({ token: refreshToken });

    if (
      !verifiedToken ||
      verifiedToken.revoked ||
      verifiedToken.expiresAt <= new Date()
    ) {
      return sendError(res, 401, "Invalid refresh token");
    }

    // 4. Revoke the old token
    verifiedToken.revoked = true;
    await verifiedToken.save();

    const user = await User.findById(verifiedToken.userId);
    if (!user) {
      return sendError(res, 401, "User not found");
    }

    const payload = {
      userId: user._id,
      email: user.email,
      role: "Student",
    };

    const accessToken = jwt.sign(payload, process.env.JSON_WEBTOKEN_SECRET, {
      expiresIn: "1m",
    });

    const newRefreshTokenString = uuid.v4();
    const hashedToken = hashToken(newRefreshTokenString);
    const expiryDate = 14 * 24 * 60 * 60 * 1000;

    const newRefreshToken = new RefreshToken({
      userId: user._id,
      token: hashedToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiryDate),
      revoked: false,
    });

    await newRefreshToken.save();

    return res
      .cookie("refreshToken", hashedToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(Date.now() + expiryDate),
      })
      .json({
        success: true,
        message: "Token refreshed",
        accessToken,
      });
  } catch (err) {
    return sendError(res, 500, "Internal server error.", err);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revoked: true }
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    return res.json({ success: true, message: "Logged out" });
  } catch (err) {
    return sendError(res, 500, "Internal server error.", err);
  }
};

module.exports = { login, register, me, refresh, logout };
