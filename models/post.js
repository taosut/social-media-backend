const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    image: {
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
    comments: {
      type: Array,
      required: true,
      comment: { type: Schema.Types.ObjectId, ref: "Comment" }
    },
    likes: {
      type: Number,
      default: 0
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Post", postSchema);
