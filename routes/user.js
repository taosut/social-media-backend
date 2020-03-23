const express = require("express");
const { body, param } = require("express-validator");

const User = require("../models/user");

const userController = require("../controllers/user");

const isAuth = require("../middleware/is-auth");

const s3Upload = require("../services/aws/s3").uploadImage;

const router = express.Router();

// GET => /users/online
router.get("/online", isAuth, userController.getOnlineUsers);

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
  userController.getUserProfile
);

// GET => /users/search/:username
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
  userController.usersSearch
);

// DELETE => /users/delete-account
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
  userController.deleteAccount
);

// PATCH => /users/update-account
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
  userController.updateAccount
);

// PUT => /users/user/set-liked-posts
router.put(
  "/user/set-liked-posts",
  isAuth,
  [
    body("postId")
      .isMongoId()
      .trim()
  ],
  userController.setLikedPosts
);

// PUT => /users/user/set-following
router.put(
  "/user/set-following",
  isAuth,
  [
    body("userId")
      .isMongoId()
      .trim()
  ],
  userController.setFollowing
);

// PATCH => /users/user/remove-token-expiration
router.patch(
  "/user/remove-token-expiration",
  isAuth,
  userController.removeTokenExpiration
);

module.exports = router;
