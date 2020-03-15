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
    followersNumber: {
      type: Number,
      default: 0
    },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followingNumber: {
      type: Number,
      default: 0
    },
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    postsNumber: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      default: ""
    },
    likedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    taggedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }]
  },
  {
    timestamps: true
  }
);

userSchema.methods.setLikedPosts = function(postId) {
  let likedPosts = this.likedPosts;
  let postAlreadyLiked = likedPosts.findIndex(
    likedPostId => likedPostId.toString() === postId.toString()
  );

  if (postAlreadyLiked !== -1) {
    likedPosts = likedPosts.filter(
      likedPostId => likedPostId.toString() !== postId.toString()
    );
  } else {
    likedPosts.push(postId);
  }

  this.likedPosts = likedPosts;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
