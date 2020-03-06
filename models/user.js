const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    profileImage: {
      type: Object,
      required: true,
      location: {
        type: String,
        required: true
      },
      key: {
        type: String,
        required: true
      }
    },
    fallowers: {
      type: Number,
      default: 0
    },
    fallowing: {
      type: Number,
      default: 0
    },
    numberOfPosts: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      default: ""
    },
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    taggedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
