const { validationResult } = require("express-validator");

const deleteS3Object = require("../services/aws/s3").deleteObject;

const Post = require("../models/post");
const User = require("../models/user");

exports.createPost = async (req, res, next) => {
  const title = req.body.title;
  const description = req.body.description;
  const image = req.file;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 406;
      throw err;
    }

    const newPost = new Post({
      title,
      description,
      image: {
        location: image.location,
        key: image.key
      },
      comments: []
    });

    await newPost.save();

    await User.updateOne({ _id: req.userId }, { $push: { posts: newPost._id } });

    res.status(200).json({
      message: "New post successfully created",
      post: newPost
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      err.message = "Validation failed";
    }

    deleteS3Object(process.env.AWS_BUCKET_NAME, profileImage.key);

    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
