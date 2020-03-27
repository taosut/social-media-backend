const express = require("express");
const { body, param, query } = require("express-validator");

const Post = require("../models/post");

const postController = require("../controllers/post");

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
      .custom(value => {
        const regEx = /^[\w\s\.\,\?\!\'\"\;\:\(\)]*$/g;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
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
      .trim(),
    query("isForUpdate").custom(value => {
      if (value && value !== "true") {
        throw new Error("Validation failed");
      }
      return true;
    })
  ],
  postController.getPost
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
      .custom(value => {
        const regEx = /^[\w\s\.\,\?\!\'\"\;\:\(\)]*$/g;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim(),
    body("postId")
      .isMongoId()
      .trim()
  ],
  postController.updatePost
);

module.exports = router;
