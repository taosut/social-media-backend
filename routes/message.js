const express = require("express");
const { body, query } = require("express-validator");

const messageController = require("../controllers/message");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// GET => /messages/get-private-messages
router.get(
  "/get-private-messages",
  isAuth,
  [
    query("username1")
      .isString()
      .isLength({ min: 2, max: 32 })
      .custom(value => {
        const regEx = /^[\w\.\-\_]{2,32}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim(),
    query("username2")
      .isString()
      .isLength({ min: 2, max: 32 })
      .custom(value => {
        const regEx = /^[\w\.\-\_]{2,32}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim()
  ],
  messageController.getMessages
);

module.exports = router;
