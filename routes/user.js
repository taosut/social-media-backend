const express = require("express");
const { body, param } = require("express-validator");

const User = require("../models/user");

const userControllers = require("../controllers/user");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// GET => /users/:username
router.get(
  "/:username",
  [
    param("username")
      .isString()
      .isLength({ min: 2, max: 32 })
      .custom(value => {
        const regEx = /^[\w\.\-\_]{2,32}$/;

        if (!regEx.test(value)) throw new Error("Character validation failed");

        return true;
      })
      .trim()
  ],
  userControllers.getUser
);

module.exports = router;
