const express = require("express");

const onlineUserController = require("../controllers/online-user");

const isAuth = require("../middleware/is-auth");

const { body } = require("express-validator");

const router = express.Router();

// POST => /online-users
router.post("/online-users", isAuth, onlineUserController.getOnlineUsers);

module.exports = router;
