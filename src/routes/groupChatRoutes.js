const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages
} = require("../controllers/groupChatController");

router.post("/send", sendMessage);
router.get("/history/:groupId", getMessages);

module.exports = router;