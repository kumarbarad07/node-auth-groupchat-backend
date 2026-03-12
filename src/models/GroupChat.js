
const mongoose = require("mongoose");

const groupChatSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: String,

    imagePath: String,

    status: {
    type: String,
    enum: ["sent", "delivered", "seen"],
    default: "sent",
  },

  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  seenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
  
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "GroupChat",
  groupChatSchema
);