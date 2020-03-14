const express = require("express");
const { body, param } = require("express-validator");

const User = require("../models/user");

const userControllers = require("../controllers/user");

const isAuth = require("../middleware/is-auth");

const s3Upload = require("../services/aws/s3").uploadImage;

const router = express.Router();

// GET => /users/:username
router.get(
  "/:username",
  [
    param("username")
      .isString()
      .isLength({ min: 2, max: 32 })
      .custom(value => {
        const regEx = /^[\w\.\-\_]{2,32}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim()
  ],
  userControllers.getUser
);

// GET => /users/search
router.get(
  "/search/:username",
  isAuth,
  [
    param("username")
      .isString()
      .custom(value => {
        const regEx = /^[\w\.\-\_]+$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim()
  ],
  userControllers.usersSearch
);

// DELETE /users/delete-account
router.delete(
  "/delete-account",
  isAuth,
  [
    body("email")
      .isEmail()
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 100 })
      .withMessage("Invalid password length")
  ],
  userControllers.deleteAccount
);

// PATCH /users/update-account
router.patch(
  "/update-account",
  isAuth,
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
      .trim(),
    body("description")
      .isLength({ min: 0, max: 150 })
      .escape()
      .trim()
  ],
  userControllers.updateAccount
);

module.exports = router;
