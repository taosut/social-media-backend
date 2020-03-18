const { validationResult } = require("express-validator");

const OnlineUser = require("../models/online-user");
const User = require("../models/user");

exports.getOnlineUsers = async (req, res, next) => {
  try {
    const loggedUser = await User.findById(req.userId);

    if (!loggedUser) {
      const error = new Error("An error occurred");
      error.statusCode = 500;
      throw error;
    }

    if (!loggedUser.following.length) {
      return res.status(200).json({
        message: "No following users online",
        onlineUsers: []
      });
    }

    let onlineUsers = await OnlineUser.find({ userId: loggedUser.following });

    return res.status(200).json({
      message: "Online users successfully fetched",
      onlineUsers: onlineUsers
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};
