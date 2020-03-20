const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    creator: {
      type: Object,
      required: true,
      _id: {
        type: Schema.Types.ObjectId,
        required: true
      },
      profileImage: {
        type: String,
        required: true
      },
      username: {
        type: String,
        required: true
      }
    },
    text: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
