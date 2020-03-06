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
      const err = new Error("Validation failed");
      err.statusCode = 406;
      err.errors = errors.array();
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user = new User({
      username,
      email,
      description,
      profileImage: {
        location: profileImage.location,
        key: profileImage.key
      },
      password: hashedPassword
    });

    await user.save();

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
