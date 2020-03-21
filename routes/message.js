const express = require("express");
const { body } = require("express-validator");

const User = require("../models/user");

const messageController = require("../controllers/message");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

module.exports = router;
