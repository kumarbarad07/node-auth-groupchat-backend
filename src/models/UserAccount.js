const { required } = require('joi');
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    userName: { type: String, required: true },
    password: { type: String, required: true },
    // confirmPassword: { type: String, required: true },
    role: { type: String, default: 'User'},
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: Date.now },
    rights: { type: Array, default: [] },
    isOnline: { type:Boolean, default:false },
    lastSeen: { type:Date }
},
{
    timestamps: true
});

// export model
const User = mongoose.model('User', UserSchema);

module.exports = User;