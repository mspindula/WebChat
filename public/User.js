const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 100,
    },

    senha: {
        type: String,
        required: true,
        minlength: 6,
    },

    admin: {
        type: Boolean,
        default: false,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },

    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    resetPasswordToken: {
    type: String,
    default: null
},

resetPasswordExpires: {
    type: Date,
    default: null
},
});

module.exports = mongoose.model("User", userSchema);
