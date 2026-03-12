
const GroupChat = require("../models/GroupChat");
const { errorResponse } = require("../utils/responseFormatter");
const { groupChat } = require("../validators/groupChatValidator");

let io;

exports.setSocketInstance = (_io) => {
  io = _io;
};


// SEND MESSAGE
exports.sendMessage = async (req, res) => {
  try {
    const { error } = groupChat.validate(req.body);
    if (error) {
      return errorResponse(res, error, "Validation Failed", 200);
    }

    const { groupId, senderId, text, imagePath } = req.body;

    const message = await GroupChat.create({
      groupId: new mongoose.Types.ObjectId(groupId),
      senderId: new mongoose.Types.ObjectId(senderId),
      text,
      imagePath,
    });

    io.to(`group_${groupId}`).emit(
      "receiveGroupMessage",
      message
    );

    res.json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (err) {
     console.error("Socket DB Error:", err);
  }
};


// GET MESSAGES BY GROUP
exports.getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log("Incoming groupId:", groupId);

    const messages = await GroupChat.find({
      groupId,
    })
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({
      message: "Messages",
      messages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


