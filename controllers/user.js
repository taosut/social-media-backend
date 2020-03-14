const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/user");
const Post = require("../models/post");

const deleteS3Object = require("../services/aws/s3").deleteObject;
const deleteS3Objects = require("../services/aws/s3").deleteObjects;

exports.getUser = async (req, res, next) => {
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
    posts.forEach(async post => {
      const postArr = [post];
      await User.updateMany(
        { likedPosts: post },
        { $pullAll: { likedPosts: postArr } }
      );
    });

    // REMOVE USER FROM FOLLOWING
    const userAccountId = [userAccount._id];
    await User.updateMany(
      { following: userAccount._id },
      {
        $pullAll: { following: userAccountId },
        $inc: { followingNumber: -1 }
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
