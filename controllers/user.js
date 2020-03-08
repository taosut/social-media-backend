const { validationResult } = require("express-validator");

const User = require("../models/user");

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
