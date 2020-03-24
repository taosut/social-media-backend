const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
require("dotenv").config();

const socket = require("../socket");

const deleteS3Object = require("../services/aws/s3").deleteObject;

const User = require("../models/user");

exports.signUp = async (req, res, next) => {
  const username = req.body.username.toLowerCase();
  const email = req.body.email;
  const password = req.body.password;
  const description = req.body.description;
  const profileImage = req.file;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const message =
        errors.array()[0].param === "email" ||
        errors.array()[0].param === "username"
          ? errors.array()[0].msg
          : "Validation failed";
      const error = new Error(message);
      error.statusCode = 406;
      error.errors = errors.array();
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let newUser = new User({
      username,
      email,
      description,
      profileImage: {
        location: profileImage.location,
        key: profileImage.key
      },
      password: hashedPassword,
      posts: [],
      taggedPosts: [],
      fallowers: [],
      fallowing: [],
      notifications: [],
      refreshTokens: []
    });

    await newUser.save();

    return res.status(200).json({ message: "User successfully created" });
  } catch (err) {
    if (err.name === "ValidationError") {
      err.message = "Validation failed";
    }

    deleteS3Object(process.env.AWS_BUCKET_NAME, profileImage.key);

    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.signIn = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const loggedUser = await User.findOne({ email: email });

    if (!loggedUser) {
      return res.status(401).json({ message: "Invalid Email/Password" });
    }

    const passwordMatched = await bcrypt.compare(password, loggedUser.password);

    if (!passwordMatched) {
      return res.status(401).json({ message: "Invalid Email/Password" });
    }

    const token = createJWT(loggedUser, process.env.JWT_ACCESS_TOKEN_SECRET);
    const refreshToken = createJWT(
      loggedUser,
      process.env.JWT_REFRESH_TOKEN_SECRET,
      "7d"
    );

    // CREATE NEW LOGIC FOR HANDLING ONLINE USERS...
    loggedUser.tokenExpiration = new Date(Date.now() + 3600000);
    loggedUser.refreshTokens.push(refreshToken);

    await loggedUser.save();

    socket.getIO().emit("add online user", {
      username: loggedUser.username,
      _id: loggedUser._id,
      profileImage: loggedUser.profileImage
    });

    res.status(200).json({
      message: "User successfully logged in",
      token: token,
      refreshToken: refreshToken
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  let projection = (
    req.query.projection || "username email profileImage description"
  ).trim();

  const projectionRegEx = /^[a-zA-z\+\-\s]+$/gi;

  try {
    if (!projectionRegEx.test(projection)) {
      const err = new Error("Validation failed");
      err.statusCode = 406;
      throw err;
    }

    const theUser = await User.findById(req.userId, projection);

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

exports.refreshToken = async (req, res, next) => {
  let refreshToken = req.body.refreshToken;

  try {
    const user = await jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );

    if (!user) {
      const error = new Error("Authentication failed");
      error.statusCode = 403;
      throw error;
    }

    const userAccount = await User.findById(user._id, { refreshTokens: 1 });

    if (!userAccount) {
      const error = new Error("Authentication failed");
      error.statusCode = 403;
      throw error;
    }
    // Remove refresh token from white-list
    userAccount.refreshTokens = userAccount.refreshTokens.filter(
      token => token !== refreshToken
    );

    refreshToken = createJWT(
      { _id: user._id, username: user.username },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      "7d"
    );
    const token = createJWT(
      { _id: user._id, username: user.username },
      process.env.JWT_ACCESS_TOKEN_SECRET
    );
    // Add newly generated refresh token to white-list
    userAccount.refreshTokens.push(refreshToken);

    await userAccount.save();

    res.status(200).json({
      message: "Token successfully refreshed",
      refreshToken,
      token
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  let refreshToken = req.body.refreshToken;

  try {
    const user = await jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );

    if (!user) {
      const error = new Error("Authentication failed");
      error.statusCode = 403;
      throw error;
    }

    const userAccount = await User.findById(user._id, { refreshTokens: 1 });

    if (!userAccount) {
      const error = new Error("Authentication failed");
      error.statusCode = 403;
      throw error;
    }

    userAccount.refreshTokens = userAccount.refreshTokens.filter(
      token => token !== refreshToken
    );

    await userAccount.save();

    res.sendStatus(204);
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

function createJWT(user, secret, expiresIn = 900) {
  return jwt.sign(
    {
      _id: user._id,
      username: user.username
    },
    secret,
    {
      expiresIn: expiresIn
    }
  );
}
