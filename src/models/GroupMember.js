const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserAccount"
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  lastSeenAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("GroupMember", groupMemberSchema);