const express = require("express");
const { body, param } = require("express-validator");

const Post = require("../models/post");

const postControllers = require("../controllers/post");

const s3Upload = require("../services/aws/s3").uploadImage;

const isAuth = require("../middleware/is-auth");

const router = express.Router();

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
  postControllers.createPost
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
  postControllers.getPost
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
  postControllers.deletePost
);

module.exports = router;
