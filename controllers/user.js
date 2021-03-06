const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Message = require("../models/message");

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

    await User.updateOne({ _id: req.userId }, { lastTimeActive: new Date() });

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

  let session = null;

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

    // START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    await Post.deleteMany({ _id: { $in: posts } });

    // REMOVE COMMENTS OF EACH POST
    const commentsInPosts = [];
    userAccount.posts.forEach(post => {
      commentsInPosts.push(...post.comments);
    });

    await Comment.deleteMany({ _id: commentsInPosts });

    // REMOVE DELETED POSTS FROM USER LIKED POSTS
    const postsObjId = posts.map(postId => new mongoose.Types.ObjectId(postId));
    await User.updateMany(
      { likedPosts: { $in: postsObjId } },
      { $pullAll: { likedPosts: postsObjId } }
    );

    // REMOVE USER FROM FOLLOWING
    const userObjectId = new mongoose.Types.ObjectId(userAccount._id);
    await User.updateMany(
      { following: userAccount._id },
      {
        $pull: { following: userObjectId }
      }
    );

    // REMOVE USER FROM FOLLOWERS
    await User.updateMany(
      { followers: userAccount._id },
      {
        $pull: { followers: userObjectId }
      }
    );

    // REMOVE USER NOTIFICATIONS FROM USERS
    await User.updateMany(
      { "notifications.from": userAccount.username },
      {
        $pull: { notifications: { from: userAccount.username } }
      }
    );

    // REMOVE USER ACCOUNT
    await User.deleteOne({ _id: userAccount._id });

    // REMOVE USER MESSAGES
    await Message.deleteMany({
      $or: [{ to: userAccount.username }, { from: userAccount.username }]
    });

    // REMOVE POSTS IMAGES FROM AWS
    const postsImages = userAccount.posts.map(post => {
      return {
        Key: post.image.key
      };
    });

    // FINISH TRANSACTION
    session.commitTransaction();

    if (postsImages.length)
      deleteS3Objects(process.env.AWS_BUCKET_NAME, postsImages);

    // REMOVE PROFILE IMAGE FROM AWS
    deleteS3Object(process.env.AWS_BUCKET_NAME, userAccount.profileImage.key);

    res.status(200).json({
      message: "Account successfully deleted with all its data"
    });
  } catch (err) {
    session.abortTransaction();
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

  let session = null;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    // START SESSION
    session = await mongoose.startSession();
    session.startTransaction();

    const userAccount = await User.findById(req.userId).session(session);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    let commentCreator = {
      username: userAccount.username,
      profileImage: userAccount.profileImage.location
    };

    let userBeforeUpdate = Object.assign({}, userAccount._doc);

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
      commentCreator.username = username;
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

      commentCreator.profileImage = userAccount.profileImage.location;
    }

    userAccount.lastTimeActive = new Date();

    await userAccount.save();

    // CHECK IF UPDATING COMMENTS IS NEEDED
    if (
      commentCreator.username !== userBeforeUpdate.username ||
      commentCreator.profileImage !== userBeforeUpdate.profileImage.location
    ) {
      await Comment.updateMany(
        {
          "creator.username": userBeforeUpdate.username
        },
        {
          "creator.username": commentCreator.username,
          "creator.profileImage": commentCreator.profileImage
        }
      );
    }

    session.commitTransaction();

    res.status(200).json({
      message: "Account successfully updated",
      user: userAccount
    });
  } catch (err) {
    session.abortTransaction();
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

exports.getOnlineUsers = async (req, res, next) => {
  try {
    let userAccount = await User.findById(req.userId);

    if (!userAccount) {
      const error = new Error("An error occured");
      error.statusCode = 500;
      throw error;
    }

    const time = Date.now() - 5 * 60 * 1000;

    let onlineUsers = await User.find(
      {
        _id: userAccount.following,
        lastTimeActive: { $gt: new Date(time) }
      },
      {
        username: 1,
        profileImage: 1
      }
    );

    userAccount.lastTimeActive = new Date();
    await userAccount.save();

    res.status(200).json({
      messsage: "Online users successfully fetched",
      onlineUsers
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};

exports.removeNotification = async (req, res, next) => {
  const username = req.body.username;
  const type = req.body.type;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    await User.updateOne(
      { _id: req.userId },
      { $pull: { notifications: { type: type, from: username } } }
    );

    res.status(200).json("Notification successfully removed");
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};
