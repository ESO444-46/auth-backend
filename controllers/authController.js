const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');

const sendError = require('../utils/sendError');
const generateToken = require('../utils/createToken');

const { loginSchema, registerSchema } = require('../schemas/authSchema');

const register = async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return sendError(res, 400, 'Invalid input.');
  }

  const { name, email, password } = result.data;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    return res.json({
      success: true,
      message: 'User registered successfully.',
    });
  } catch (err) {
    return sendError(res, 500, 'Internal server error.', err);
  }
};

const login = async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return sendError(res, 400, 'Invalid input.');
  }

  const { password } = result.data;
  const user = req.user;
  try {
    const hashedPassword = user.password;
    const verifiedPassword = await bcrypt.compare(password, hashedPassword);

    if (!verifiedPassword) {
      return sendError(res, 401, 'Incorrect credentials. Please try again.');
    }

    const { accessToken, refreshToken, expiryDate } = generateToken(user);

    return res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: new Date(Date.now() + expiryDate),
      })
      .json({
        success: true,
        message: 'Logged in',
        accessToken,
      });
  } catch (err) {
    return sendError(res, 500, 'Internal server error.', err);
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendError(res, 401, 'Token required. Please log in.');
    }

    let verifiedToken;
    try {
      verifiedToken = jwt.verify(authHeader, process.env.JSON_WEBTOKEN_SECRET);
    } catch (err) {
      return sendError(
        res,
        401,
        'Invalid or expired token. Please log in again.',
        err
      );
    }

    const userId = verifiedToken.userId;
    const user = await User.findById({ _id: userId });
    return res.json({ success: true, user });
  } catch (err) {
    return sendError(res, 500, 'Internal server error.', err);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return sendError(res, 401, 'Unauthorized. Please login');
    }

    const verifiedToken = await RefreshToken.findOne({ token: refreshToken });

    if (
      !verifiedToken ||
      verifiedToken.revoked ||
      verifiedToken.expiresAt <= new Date()
    ) {
      return sendError(res, 401, 'Invalid refresh token');
    }

    // 4. Revoke the old token
    verifiedToken.revoked = true;
    await verifiedToken.save();

    const user = await User.findById(verifiedToken.userId);
    if (!user) {
      return sendError(res, 401, 'User not found');
    }

    const { accessToken, newrefreshToken, expiryDate } = generateToken(user);

    return res
      .cookie('refreshToken', newrefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: new Date(Date.now() + expiryDate),
      })
      .json({
        success: true,
        message: 'Token refreshed',
        accessToken,
      });
  } catch (err) {
    return sendError(res, 500, 'Internal server error.', err);
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

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    return sendError(res, 500, 'Internal server error.', err);
  }
};

module.exports = { login, logout, register, me, refresh };
