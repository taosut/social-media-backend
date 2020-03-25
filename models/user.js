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
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    description: {
      type: String,
      default: ""
    },
    likedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    taggedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    refreshTokens: [
      {
        type: Object,
        expiresAt: { type: Date, required: true },
        refreshToken: {
          type: String,
          required: true
        }
      }
    ],
    lastTimeActive: {
      type: Date
    },
    notifications: [
      {
        type: Object,
        type: { type: String },
        from: {
          type: String
        },
        number: {
          type: Number
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

userSchema.methods.setLikedPosts = function(postId) {
  let likedPosts = this.likedPosts;
  let isPostAlreadyLiked = likedPosts.some(
    likedPostId => likedPostId.toString() === postId.toString()
  );

  if (isPostAlreadyLiked) {
    likedPosts = likedPosts.filter(
      likedPostId => likedPostId.toString() !== postId.toString()
    );
  } else {
    likedPosts.push(postId);
  }

  this.likedPosts = likedPosts;
  this.lastTimeActive = new Date();
  return this.save();
};

userSchema.methods.setFollowing = function(userId) {
  let following = this.following;
  let isAlreadyFollowing = following.some(
    followingUserId => followingUserId.toString() === userId.toString()
  );

  if (isAlreadyFollowing) {
    following = following.filter(
      followingUserId => followingUserId.toString() !== userId.toString()
    );
  } else {
    following.push(userId);
  }

  this.following = following;
  this.lastTimeActive = new Date();
  return this.save();
};

userSchema.methods.addNotification = function(newNotification) {
  let notifications = this.notifications;
  let sameNotificationIndex = notifications.findIndex(
    notification =>
      notification.from === newNotification.from &&
      notification.type === newNotification.type
  );

  if (sameNotificationIndex !== -1) {
    notifications[sameNotificationIndex].number++;
  } else {
    notifications.push(newNotification);
  }

  this.notifications = notifications;

  return this.save();
};

module.exports = mongoose.model("User", userSchema);
