const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/user");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (authHeader) {
    const err = new Error("Authorization failed");
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    const err = new Error("Authorization failed");
    err.statusCode = 401;
    return next(err);
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    return next(err);
  }

  if (!decodedToken) {
    const err = new Error("Authorization failed");
    err.statusCode = 401;
    return next(err);
  }

  req.userId = decodedToken._id;
  next();
};
