const express = require("express");
const { body, param, query } = require("express-validator");
const slowDown = require("express-slow-down");

const Post = require("../models/post");

const postController = require("../controllers/post");

const s3Upload = require("../services/aws/s3").uploadImage;

const isAuth = require("../middleware/is-auth");

const router = express.Router();

const getPostsSpeedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 minutes
  delayAfter: 10, // allow 5 requests to go at full-speed, then...
  delayMs: 100 // 6th request has a 100ms delay, 7th has a 200ms delay, 8th gets 300ms, etc.
});

// POST => /posts/create-post
router.post(
  "/create-post",
  isAuth,
  s3Upload.single("image"),
  [
    body("title")
      .custom(value => {
        const regEx = /^[\w\s\.\,\-\?\!]{2,150}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .isLength({ min: 2, max: 150 })
      .trim(),
    body("description")
      .isString()
      .isLength({ min: 0, max: 2200 })
      .escape()
      .trim()
  ],
  postController.createPost
);

// GET => /posts/:post
router.get(
  "/:post",
  isAuth,
  [
    param("post")
      .isMongoId()
      .trim()
  ],
  postController.getPost
);

// GET => /posts/get-post-for-update/:post
router.get(
  "/get-post-for-update/:post",
  isAuth,
  [
    param("post")
      .isMongoId()
      .trim()
  ],
  postController.getPostForUpdate
);

// DELETE => /posts/delete-post
router.delete(
  "/delete-post",
  isAuth,
  [
    body("postId")
      .isMongoId()
      .trim()
  ],
  postController.deletePost
);

// GET => /posts
router.get(
  "/",
  getPostsSpeedLimiter,
  isAuth,
  [
    query("skip").custom(value => {
      if (Number.isNaN(Number(value)) || Number(value) < 0) return false;

      return true;
    }),
    query("limit").custom(value => {
      if (Number.isNaN(Number(value)) || Number(value) < 0) return false;

      return true;
    })
  ],
  postController.getPosts
);

// PATCH => /posts/update-post
router.patch(
  "/update-post",
  isAuth,
  s3Upload.single("image"),
  [
    body("title")
      .custom(value => {
        const regEx = /^[\w\s\.\,\-\?\!]{2,150}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .isLength({ min: 2, max: 150 })
      .trim(),
    body("description")
      .isString()
      .isLength({ min: 0, max: 2200 })
      .escape()
      .trim(),
    body("postId")
      .isMongoId()
      .trim()
  ],
  postController.updatePost
);

module.exports = router;
