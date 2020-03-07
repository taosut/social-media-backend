const { validationResult } = require("express-validator");

const deleteS3Object = require("../services/aws/s3").deleteObject;

const Post = require("../models/post");
const User = require("../models/user");

exports.createPost = async (req, res, next) => {
  const title = req.body.title;
  const description = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw err;
    }

    const newPost = new Post({
      title,
      description,
      image: {
        location: image.location,
        key: image.key
      },
      comments: [],
      creator: req.userId
    });

    await newPost.save();

    await User.updateOne(
      { _id: req.userId },
      { $push: { posts: newPost._id } }
    );

    res.status(200).json({
      message: "New post successfully created",
      post: newPost
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      err.message = "Validation failed";
    }

    deleteS3Object(process.env.AWS_BUCKET_NAME, profileImage.key);

    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.post;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw err;
    }

    const thePost = await Post.findById(postId).populate("comments");

    if (!thePost) return res.status(404).json({ message: "Post not found" });

    return res.status(200).json({
      message: "Post successfully fetched",
      post: thePost
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.body.postId;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw err;
    }

    const deletePost = await Post.findById(postId);

    if (!deletePost) return res.status(404).json({ message: "Post not found" });

    if (deletePost.creator.toString() !== req.userId.toString())
      return res.status(401).json({
        message: "Action is forbidden"
      });

    await Post.deleteOne({ _id: postId });
    await User.updateOne({ _id: req.userId }, { $pull: { posts: postId } });
    deleteS3Object(process.env.AWS_BUCKET_NAME, deletePost.image.key);

    return res.status(200).json({
      message: "Post successfully deleted"
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getPosts = async (req, res, next) => {
  // VALIDATE THIS
  const skipPosts = Number(req.query.skip) || 0;
  const limitPosts = Number(req.query.limit) || 50;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw err;
    }

    const loggedUser = await User.findById(req.userId, "following");
    // 204
    if (!loggedUser.following.length)
      return res.status(200).json({
        message: "No Content"
      });

    const feed = await Post.find({ creator: { $in: loggedUser.following } })
      .skip(skipPosts)
      .limit(limitPosts);

    if (!feed.length)
      return res.status(200).json({
        message: "No Content"
      });

    return res.status(200).json({
      message: "Posts successfully fetched",
      posts: feed
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
