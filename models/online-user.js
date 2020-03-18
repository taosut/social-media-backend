const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const onlineUsersSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      index: true
    },
    profileImage: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true
    }
  },
  {
    timestamps: true,
    autoIndex: false
  }
);

module.exports = mongoose.model("OnlineUser", onlineUsersSchema);
