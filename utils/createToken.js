const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const RefreshToken = require('../models/refreshTokenModel');
const hashToken = require('../utils/hashToken');

const generateToken = async (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
  };
  const accessToken = jwt.sign(payload, process.env.JSON_WEBTOKEN_SECRET, {
    expiresIn: '15m',
  });

  const refreshTokenString = uuid.v4();
  const hashedRefreshToken = hashToken(refreshTokenString);
  const expiryDate = 14 * 24 * 60 * 60 * 1000;

  const newRefreshToken = new RefreshToken({
    userId: user._id,
    token: hashedRefreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiryDate),
    revoked: false,
  });
  try {
    await newRefreshToken.save();
    return {
      accessToken,
      newrefreshToken: refreshTokenString,
      expiryDate,
    };
  } catch (err) {
    throw new Error('Failed to save refresh token');
  }
};

module.exports = generateToken;
