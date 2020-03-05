const express = require("express");

const authControllers = require("../controllers/auth");

const s3Upload = require("../services/aws/s3");

const router = express.Router();

// POST => /auth/sign-up ** VALIDATE THIS **
router.post(
  "/sign-up",
  s3Upload.single("profileImage"),
  authControllers.signUp
);

// POST => /auth/sign-in ** VALIDATE THIS **

module.exports = router;
