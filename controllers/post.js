const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const deleteS3Object = require("../services/aws/s3").deleteObject;

const Post = require("../models/post");
const User = require("../models/user");
const Comment = require("../models/comment");

const socket = require("../socket");

exports.createPost = async (req, res, next) => {
  const title = req.body.title;
  const description = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
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

    let userAccount = await User.findById(req.userId);

    userAccount.posts.push(newPost._id);
    userAccount.lastTimeActive = new Date();
    await userAccount.save();

    socket.getIO().emit("new post created", {
      ...newPost._doc,
      creator: {
        _id: userAccount._id,
        profileImage: userAccount.profileImage,
        username: userAccount.username
      }
    });

    res.status(200).json({
      message: "New post successfully created",
      post: newPost
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      err.message = "Validation failed";
    }
    if (image) deleteS3Object(process.env.AWS_BUCKET_NAME, image.key);

    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.post;
  const isForUpdate = Boolean(req.query.isForUpdate) || false;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    let thePost;

    if (isForUpdate) {
      thePost = await Post.findById(postId, {
        title: 1,
        description: 1,
        image: 1
      });
    } else {
      thePost = await Post.findById(postId)
        .populate({ path: "creator", select: "username profileImage" })
        .populate("comments");
    }

    if (!thePost) return res.status(404).json({ message: "Post not found" });

    await User.updateOne({ _id: req.userId }, { lastTimeActive: new Date() });

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
  const postObjectId = new mongoose.Types.ObjectId(postId);

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const deletePost = await Post.findById(postId);

    if (!deletePost) return res.status(404).json({ message: "Post not found" });

    if (deletePost.creator.toString() !== req.userId.toString())
      return res.status(401).json({
        message: "Action is forbidden"
      });

    // DELETE POST
    await Post.deleteOne({ _id: postId });
    await User.updateOne(
      { _id: req.userId },
      {
        $pull: { posts: postObjectId },
        lastTimeActive: new Date()
      }
    );

    // DELETE POST IMAGE
    deleteS3Object(process.env.AWS_BUCKET_NAME, deletePost.image.key);

    // DELETE POST COMMENTS
    await Comment.deleteMany({ _id: deletePost.comments });

    // REMOVE POST FROM USER LIKED POSTS
    await User.updateMany(
      { likedPosts: postId },
      { $pull: { likedPosts: postObjectId } }
    );

    socket.getIO().emit("remove post", postId);

    return res.status(200).json({
      message: "Post successfully deleted"
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getPosts = async (req, res, next) => {
  const skipPosts = Number(req.query.skip) || 0;
  let limitPosts = Number(req.query.limit) || 50;

  limitPosts = limitPosts > 100 ? 100 : limitPosts;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const loggedUser = await User.findById(req.userId, "following");
    loggedUser.lastTimeActive = new Date();
    await loggedUser.save();

    if (!loggedUser.following.length)
      return res.status(200).json({
        message: "No Content",
        posts: []
      });

    const feed = await Post.find({ creator: { $in: loggedUser.following } })
      .sort({ _id: "-1" })
      .skip(skipPosts)
      .limit(limitPosts)
      .populate({ path: "creator", select: "username profileImage" });

    return res.status(200).json({
      message: "Posts successfully fetched",
      posts: feed
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.body.postId;
  const title = req.body.title;
  const description = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const updatePost = await Post.findById(postId).populate({
      path: "creator",
      select: "username profileImage"
    });

    if (!updatePost) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }

    if (updatePost.creator._id.toString() != req.userId.toString()) {
      return res.status(401).json({
        message: "Action is forbidden"
      });
    }

    updatePost.title = title;
    updatePost.description = description;

    if (image) {
      deleteS3Object(process.env.AWS_BUCKET_NAME, updatePost.image.key);
      let newImage = {
        location: image.location,
        key: image.key
      };
      updatePost.image = newImage;
    }

    await updatePost.save();

    await User.updateOne({ _id: req.userId }, { lastTimeActive: new Date() });

    socket.getIO().emit("update post", updatePost);

    res.status(200).json({
      message: "Post successfully updated",
      post: updatePost
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      err.message = "Validation failed";
    }
    if (image) deleteS3Object(process.env.AWS_BUCKET_NAME, image.key);

    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
