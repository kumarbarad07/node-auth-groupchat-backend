const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    groupName: {
      type: String,
      required: true
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAccount",
      required: true,
    },
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "UserAccount",
    //   required: true,
    // },

    // only stores userId not _id
    // members: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "UserAccount"
    //   }
    // ],

    members: [
      {
        // _id: false,   // Disable auto _id
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserAccount",
          required: true,
        }
      }
    ],

    lastMessage: {
      type: String,
      default: ""
    },
    lastMessageAt: {
      type: Date
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);