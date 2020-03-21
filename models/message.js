const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    from: {
      type: Object,
      required: true,
      username: {
        type: String,
        required: true
      },
      profileImage: {
        type: String,
        required: true
      }
    },
    to: {
      type: Object,
      required: true,
      username: {
        type: String,
        required: true
      },
      profileImage: {
        type: String,
        required: true
      }
    },
    message: {
      type: String,
      required: true
    }
  },
  {
    timestamps: {
      createdAt,
      updatedAt: false
    }
  }
);

module.exports = mongoose.model("Message", messageSchema);
