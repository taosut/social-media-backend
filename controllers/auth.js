const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
require("dotenv").config();

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
      fallowing: []
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

    const token = jwt.sign(
      {
        _id: loggedUser._id,
        email: loggedUser.email,
        username: loggedUser.username
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h"
      }
    );

    res.status(200).json({
      message: "User successfully logged in",
      token: token,
      tokenExpiration: jwt.verify(token, process.env.JWT_SECRET_KEY).exp,
      user: loggedUser
    });
  } catch (err) {}
};
