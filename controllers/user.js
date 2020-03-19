const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const mongoose = require("mongoose");

const socket = require("../socket");

const User = require("../models/user");
const Post = require("../models/post");

const deleteS3Object = require("../services/aws/s3").deleteObject;
const deleteS3Objects = require("../services/aws/s3").deleteObjects;

exports.getUserProfile = async (req, res, next) => {
  const username = req.params.username;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const theUser = await User.findOne({ username: username }, "-password")
      .populate("posts")
      .populate("taggedPosts");

    if (!theUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "User successfully fetched",
      user: theUser
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.usersSearch = async (req, res, next) => {
  const username = req.params.username;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const users = await User.find(
      {
        username: { $regex: username, $options: "i" }
      },
      { username: 1, profileImage: 1 }
    ).limit(20);

    if (!users) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    res.status(200).json({
      message: "User successfully fetched",
      users: users
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const userAccount = await User.findOne({ email: email }).populate({
      path: "posts",
      select: "comments image"
    });

    if (!userAccount) {
      const error = new Error("Profile not found");
      error.statusCode = 404;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, userAccount.password);

    if (!passwordMatch) {
      const error = new Error("Invalid password");
      error.statusCode = 403;
      throw error;
    }

    // REMOVE ALL POSTS
    const posts = userAccount.posts.map(post => post._id);

    await Post.deleteMany({ _id: { $in: posts } });

    // REMOVE POSTS IMAGES FROM AWS
    const postsImages = userAccount.posts.map(post => {
      return {
        Key: post.image.key
      };
    });

    if (postsImages.length)
      deleteS3Objects(process.env.AWS_BUCKET_NAME, postsImages);

    // REMOVE POST COMMENTS
    const postsComments = [];
    userAccount.posts.forEach(post => {
      postsComments.push(...post.comments);
    });

    // remove comments from comments collection...

    // REMOVE DELETED POSTS FROM USER LIKED POSTS
    posts.forEach(async postId => {
      const postObjectId = new mongoose.Types.ObjectId(postId);
      await User.updateMany(
        { likedPosts: postId },
        { $pull: { likedPosts: postObjectId } }
      );
    });

    // REMOVE USER FROM FOLLOWING
    const userObjectId = new mongoose.Types.ObjectId(userAccount._id);
    await User.updateMany(
      { following: userAccount._id },
      {
        $pull: { following: userObjectId }
      }
    );

    // REMOVE USER ACCOUNT
    await User.deleteOne({ _id: userAccount._id });
    // REMOVE PROFILE IMAGE FROM AWS
    deleteS3Object(process.env.AWS_BUCKET_NAME, userAccount.profileImage.key);

    res.status(200).json({
      message: "Account successfully deleted with all its data"
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.updateAccount = async (req, res, next) => {
  const username = req.body.username.toLowerCase();
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const profileImage = req.file;
  const description = req.body.description;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }
    // USERNAME CHECK & CHANGE
    if (userAccount.username !== username) {
      let usernameExist = await User.findOne({
        username: username
      }).countDocuments();

      if (usernameExist) {
        const error = new Error("Username is already in use");
        error.statusCode = 406;
        throw error;
      }

      userAccount.username = username;
    }

    // DESCRIPTION CHECK & CHANGE
    if (userAccount.description !== description)
      userAccount.description = description;

    // PASSWORD CHECK & CHANGE
    if (currentPassword) {
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        userAccount.password
      );

      if (!passwordMatch) {
        const error = new Error("Invalid password");
        error.statusCode = 406;
        throw error;
      }

      if (newPassword.length < 8 || newPassword.length > 100) {
        const error = new Error("Validation failed");
        error.statusCode = 406;
        throw error;
      }

      const newHashedPassword = await bcrypt.hash(newPassword, 12);
      userAccount.password = newHashedPassword;
    }

    // PROFILE IMAGE CHECK & CHANGE
    if (profileImage) {
      deleteS3Object(process.env.AWS_BUCKET_NAME, userAccount.profileImage.key);

      userAccount.profileImage = {
        key: profileImage.key,
        location: profileImage.location
      };
    }

    await userAccount.save();

    res.status(200).json({
      message: "Account successfully updated",
      user: userAccount
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    if (profileImage)
      deleteS3Object(process.env.AWS_BUCKET_NAME, profileImage.key);

    next(err);
  }
};

exports.setLikedPosts = async (req, res, next) => {
  const postId = req.body.postId;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    let likedPostsNumber = userAccount.likedPosts.length;

    await userAccount.setLikedPosts(postId);

    if (likedPostsNumber < userAccount.likedPosts.length)
      await Post.updateOne({ _id: postId }, { $inc: { likes: 1 } });
    else await Post.updateOne({ _id: postId }, { $inc: { likes: -1 } });

    res.status(200).json({
      message: "Liked posts successfully updated",
      likedPosts: userAccount.likedPosts
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.setFollowing = async (req, res, next) => {
  const userId = req.body.userId;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    let followingNumber = userAccount.following.length;

    await userAccount.setFollowing(userId);

    if (followingNumber < userAccount.following.length) {
      await User.updateOne(
        { _id: userId },
        { $push: { followers: userAccount._id } }
      );
    } else {
      const userAccountObjectId = new mongoose.Types.ObjectId(userAccount._id);
      await User.updateOne(
        { _id: userId },
        { $pull: { followers: userAccountObjectId } }
      );
    }

    res.status(200).json({
      message: "Following is set successfully",
      following: userAccount.following
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.setOnlineActivity = async (req, res, next) => {
  const isOnline = req.body.isOnline;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    userAccount.isOnline = isOnline;

    await userAccount.save();

    if (isOnline) {
      socket.getIO().emit("add online user", {
        username: userAccount.username,
        profileImage: userAccount.profileImage,
        _id: userAccount._id
      });
    } else {
      socket.getIO().emit("remove online user", userAccount._id);
    }

    res.status(200).json({
      message: "User online status succussfully updated"
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getOnlineUsers = async (req, res, next) => {
  try {
    let userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    let onlineUsers = await User.find(
      {
        _id: userAccount.following,
        tokenExpiration: new Date()
      },
      {
        username: 1,
        profileImage: 1
      }
    );

    res.status(200).json({
      messsage: "Online users successfully fetched",
      onlineUsers
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};
