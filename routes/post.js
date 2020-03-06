const express = require("express");
const { body, param } = require("express-validator");

const Post = require("../models/post");

const postControllers = require("../controllers/post");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

// POST => /posts/create-post ** VALIDATE THIS **
router.post("/create-post", isAuth, postControllers.createPost);

module.exports = router;
