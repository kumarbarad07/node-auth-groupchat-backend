// validations/groupValidation.js

const Joi = require("joi");

exports.createGroupSchema = Joi.object({
  groupName: Joi.string().min(3).max(50).required(),

  adminId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),

  // userId: Joi.string()
  //   .regex(/^[0-9a-fA-F]{24}$/)
  //   .required(),
  members: Joi.array()
    .items(
      Joi.object({
        userId: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required()
      })
    )
    .min(1)
    .required(),
});