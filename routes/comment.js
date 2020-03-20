const express = require("express");
const { body } = require("express-validator");

const commentController = require("../controllers/comment");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// POST => /comments/create-comment
router.post(
  "/create-comment",
  isAuth,
  [
    body("postId")
      .isMongoId()
      .trim(),
    body("text")
      .isLength({ min: 2, max: 2000 })
      .escape()
      .trim()
  ],
  commentController.createComment
);

// DELETE => /comments/delete-comment
router.delete(
  "/delete-comment",
  isAuth,
  [
    body("commentId")
      .isMongoId()
      .trim()
  ],
  commentController.deleteComment
);

module.exports = router;
