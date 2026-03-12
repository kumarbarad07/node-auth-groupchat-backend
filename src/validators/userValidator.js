const Joi = require('joi');

const chartPattern = Joi.object({
    userId: Joi.string().required(),
    text: Joi.string().required(),
    imagePath: Joi.string().required()
});

module.exports = {
    chartPattern
}