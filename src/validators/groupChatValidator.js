const Joi = require('joi');

const groupChat = Joi.object({
  groupId: Joi.string().required(),
  senderId: Joi.string().required(),
  text: Joi.string().allow(""),
  imagePath: Joi.string().allow("")
});

module.exports = {
    groupChat
}