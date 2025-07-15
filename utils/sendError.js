const sendError = (res, status, message, err) => {
  if (status === 500 && process.env.NODE_ENV === "development" && err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  } else {
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

module.exports = sendError;
