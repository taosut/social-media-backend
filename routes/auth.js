const express = require("express");
const { body } = require("express-validator");

const User = require("../models/user");

const authController = require("../controllers/auth");
const signUpBruteforce = require("../controllers/rate-limit").signUpBruteforce;
const signInBruteforce = require("../controllers/rate-limit").signInBruteforce;

const s3Upload = require("../services/aws/s3").uploadImage;

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// POST => /auth/sign-up
router.post(
  "/sign-up",
  signUpBruteforce.prevent,
  s3Upload.single("profileImage"),
  [
    body("username")
      .isString()
      .isLength({ min: 2, max: 32 })
      .custom(value => {
        const regEx = /^[\w\.\-\_]{2,32}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .custom(async value => {
        const user = await User.findOne({ username: value });

        if (user) return Promise.reject("Username is already in use");
      })
      .trim(),
    body("email")
      .isEmail()
      .custom(async value => {
        const user = await User.findOne({ email: value });

        if (user) return Promise.reject("E-mail is already in use");
      })
      .normalizeEmail(),
    body("description")
      .isLength({ min: 0, max: 150 })
      .custom(value => {
        const regEx = /^[\w\s\.\,\?\!\'\"\;\:\(\)]*$/g;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim(),
    body("password")
      .isLength({ min: 8, max: 100 })
      .withMessage("Invalid password length")
  ],
  authController.signUp
);

// POST => /auth/sign-in
router.post(
  "/sign-in",
  signInBruteforce.getMiddleware({
    key: function(req, res, next) {
      next(req.body.email);
    }
  }),
  authController.signIn
);

// POST => /auth/refresh-token
router.post("/refresh-token", authController.refreshToken);

// POST => /auth/logout
router.post("/logout", isAuth, authController.logout);

// GET => /auth/user
router.get("/user", isAuth, authController.getUser);

module.exports = router;
