const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = (req, res, next) => {
  const authHeader = req.get("Authentication failed");
  if (!authHeader) {
    const err = new Error("Authentication failed");
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    const err = new Error("Authentication failed");
    err.statusCode = 401;
    return next(err);
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;

    return next(err);
  }

  if (!decodedToken) {
    const err = new Error("Authentication failed");
    err.statusCode = 401;
    return next(err);
  }

  req.userId = decodedToken._id;
  next();
};
