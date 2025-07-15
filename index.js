require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const authController = require("./controllers/authController");
const sendError = require("./utils/sendError");
const app = express();
app.use(express.json());

async function databaseConnect() {
  const connectionString = process.env.CONNECTION_STRING;
  await mongoose.connect(connectionString);
  console.log("Database connected.");
}

app.post("/register", authController.register);
app.post("/login", authController.login);
app.get("/me", authController.me);

app.use((err, req, res, next) => {
  return sendError(res, 500, "Something went wrong!", err);
});

const PORT = process.env.PORT;
databaseConnect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on PORT:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

module.exports = app;
