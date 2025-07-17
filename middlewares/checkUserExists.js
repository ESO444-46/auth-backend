const checkUserSchema = require('../schemas/checkUser');
const User = require('../models/userModel');
const sendError = require('../utils/sendError');

function checkUserExists(shouldExist = true) {
  return async (req, res, next) => {
    try {
      const result = checkUserSchema.safeParse(req.body);
      if (!result.success) {
        return sendError(res, 401, 'Incorrect Email');
      }

      const { email } = result.data;
      const user = await User.findOne({ email });

      if (shouldExist && !user) {
        return sendError(res, 404, 'User not found');
      }

      if (!shouldExist && user) {
        return sendError(res, 409, 'User already exists');
      }

      req.user = user;
      next();
    } catch (err) {
      sendError(res, 500, 'Internal server Error', err);
    }
  };
}

module.exports = checkUserExists;
