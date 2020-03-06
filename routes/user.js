const express = require("express");

const User = require("../models/user");

const userControllers = require("../controllers/user");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// GET => /users/:username
router.get("/:username", userControllers.getUser);

module.exports = router;
