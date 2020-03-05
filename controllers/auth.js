const { validationResult } = require("express-validator");

exports.signUp = async (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const description = req.body.description;
  const profileImage = req.file;
  

  return res.status(200).json({ message: "User successfully created" });
};
