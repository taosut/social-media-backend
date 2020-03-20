const { validationResult } = require("express-validator");

const Comment = require("../models/comment");
const User = require("../models/user");
const Post = require("../models/post");

exports.createComment = async (req, res, next) => {
  const postId = req.body.postId;
  const text = req.body.text;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const creator = await User.findById(req.userId, "username profileImage");

    const newComment = new Comment({
      postId: postId,
      text: text,
      creator: {
        _id: creator._id,
        username: creator.username,
        profileImage: creator.profileImage.location
      }
    });

    await newComment.save();

    await Post.updateOne(
      { _id: postId },
      { $push: { comments: newComment._id } }
    );

    res.status(200).json({
      message: "Post successfully createrd",
      comment: newComment
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
