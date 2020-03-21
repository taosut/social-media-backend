const { validationResult } = require("express-validator");

const Message = require("../models/message");
const User = require("../models/user");

const socket = require("../socket");

exports.getMessages = async (req, res, next) => {
  const username1 = req.query.username1;
  const username2 = req.query.username2;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw error;
    }

    const users = await User.find({
      $or: [{ username: username1 }, { username: username2 }]
    });

    if (users.length !== 2) {
      const error = new Error("An error occurred - user not found");
      error.statusCode = 500;
      throw error;
    }

    if (!users.some(user => user._id.toString() == req.userId)) {
      return res.status(401).json({
        message: "Action is forbidden"
      });
    }

    const messages = await Message.find({
      $or: [
        { "from.username": username1, "to.username": username2 },
        { "from.username": username2, "to.username": username1 }
      ]
    });

    res.status(200).json({
      message: "Messages successfully fetched",
      messages: messages
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    next(err);
  }
};
