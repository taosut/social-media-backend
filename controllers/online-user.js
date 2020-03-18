const { validationResult } = require("express-validator");

const OnlineUser = require("../models/online-user");

exports.getOnlineUsers = async (req, res, next) => {
  let following = req.body.following;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    if (!following.length) {
      return res.status(200).json({
        message: "No following users online",
        onlineUsers: []
      });
    }

    let onlineUsers = await OnlineUser.find({ userId: following });

    return res.status(200).json({
      message: "Online users successfully fetched",
      onlineUsers: onlineUsers
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};
