const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Comment = require("../models/comment");
const User = require("../models/user");
const Post = require("../models/post");

exports.createComment = async (req, res, next) => {
  const postId = req.body.postId;
  const text = req.body.text;

  let session = null;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const creator = await User.findById(
      req.userId,
      "username profileImage"
    ).session(session);

    const newComment = new Comment({
      postId: postId,
      text: text,
      creator: {
        _id: creator._id,
        username: creator.username,
        profileImage: creator.profileImage.location
      }
    })
    creator.lastTimeActive = new Date();

    await newComment.save();
    await creator.save();
    await Post.updateOne(
      { _id: postId },
      { $push: { comments: newComment._id } }
    );

    session.commitTransaction();

    res.status(200).json({
      message: "Post successfully createrd",
      comment: newComment
    });
  } catch (err) {
    session.abortTransaction();
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  const commentId = req.body.commentId;

  let session = null;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const comment = await Comment.findById(commentId);
    const post = await Post.findById(comment.postId, "creator");

    if (
      comment.creator._id.toString() !== req.userId.toString() &&
      post.creator.toString() !== req.userId.toString()
    ) {
      return res.status(401).json({
        message: "Action is forbidden"
      });
    }

    await Comment.deleteOne({ _id: comment._id });
    await User.updateOne({ _id: req.userId }, { lastTimeActive: new Date() });
    await Post.updateOne(
      { _id: comment.postId },
      { $pull: { comments: comment._id } }
    );

    session.commitTransaction();

    return res.status(200).json({
      message: "Comment successfully deleted"
    });
  } catch (err) {
    session.abortTransaction();
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
