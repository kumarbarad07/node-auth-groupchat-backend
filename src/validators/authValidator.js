const Joi = require("joi");

const User = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().min(10).max(10).required(),
    userName: Joi.string().required().min(6),
    password: Joi.string().required().min(6),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Password must match'
        })
    , rights: Joi.array()
        .items(Joi.object())
        .default([])
})

const userLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
})

const userNameLogin = Joi.object({
  userName: Joi.string().min(6).required(),
  password: Joi.string().min(6).required(),
})

module.exports = {
    User,
    userLogin,
    userNameLogin
}