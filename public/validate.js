const Joi = require("@hapi/joi");

const registerValidate = (data) => {
    const schema = Joi.object({
        nome: Joi.string().min(3).max(50).required(),

        email: Joi.string().email().required(),

        senha: Joi.string().min(6).max(100).required(),
    });

    return schema.validate(data);
};

const loginValidate = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),

        senha: Joi.string().min(6).required(),
    });

    return schema.validate(data);
};

module.exports = {
    registerValidate,
    loginValidate,
};
