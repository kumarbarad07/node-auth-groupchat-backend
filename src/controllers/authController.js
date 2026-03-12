const logger = require('../config/logger');
const mongoose = require('mongoose')
const UserAccount = require('../models/UserAccount');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/token');
const jwt = require('jsonwebtoken');
const client = require('../config/redis');
const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");

const {
    User,
    userLogin
} = require('../validators/authValidator');

exports.registerUser = async (req, res) => {
    try {
        const { error } = User.validate(req.body);
        if (error) {
            return errorResponse(
                res,
                error.details[0].message,
                "Validation Failed",
                200
            );
        }

        let {
            email,
            name,
            phoneNumber,
            userName,
            password,
            confirmPassword,
        } = req.body;

        if (password !== confirmPassword) {
            return errorResponse(
                res,
                "Password mismatch",
                "Password and Confirm Password must be same",
                200
            );
        }

        const existingUser = await UserAccount.findOne({ email });
        if (existingUser) {
            return errorResponse(res, "User Already Exists", 200);
        }

        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);

        const userAccount = new UserAccount({
            email,
            name,
            phoneNumber,
            userName,
            password: encryptedPassword,
            role: "User", // default role
        });

        await userAccount.save();

        // GROUP CREATE

        const adminId = new mongoose.Types.ObjectId(
            "69898d851fdf6142f56e6154"
        );

        const groupName = `${userAccount.name}_${userAccount._id.toString().slice(-6)}`;

        // const group = await Group.create({
        //     groupName,
        //     adminId,
        //     userId: userAccount._id,
        // });

        const userId = Array.isArray(userAccount._id) ? userId : [userAccount._id];

        // remove duplicates
        const membersFormatted = userId.map(id => ({
            userId: id
        }));

        const group = await Group.create({
            groupName,
            adminId,
            members: membersFormatted,
        });

        // Create GroupMember entries for admin and user

        await GroupMember.insertMany([
            {
                groupId: group._id,
                groupName: group.groupName,
                userId: adminId,
                unreadCount: 0
            },
            {
                groupId: group._id,
                groupName: group.groupName,
                userId: userAccount._id,
                unreadCount: 0
            }
        ]);


        return successResponse(
            res,
            {
                user: userAccount,
                group
            },
            "User Created Successfully",
            201
        );
    } catch (error) {
        logger.error("Error During Registering User", error);
        return errorResponse(res, error.message, "Error", 500);
    }
};

// LOGIN
exports.userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const { error } = userLogin.validate(req.body);
        if (error) {
            return errorResponse(
                res,
                error.details[0].message,
                "Validation failed",
                401
            );
        }

        const existingUser = await UserAccount.findOne({ email });
        if (!existingUser) {
            return errorResponse(res, "User not found", "User not found", 401);
        }

        const isMatch = await bcrypt.compare(
            password,
            existingUser.password
        );

        if (!isMatch) {
            return errorResponse(res, "Invalid Credentials", 401);
        }

        // TOKENS
        const accessToken = generateToken({
            id: existingUser._id,
            email: existingUser.email,
            role: existingUser.role,
        });

        const refreshToken = generateRefreshToken({
            id: existingUser._id,
        });

        // FETCH GROUPS
        // let groups = [];

        // if (existingUser.role === "Admin") {
        //     groups = await Group.aggregate([
        //         {
        //             $match: {
        //                 adminId: existingUser._id,
        //             },
        //         },
        //         {
        //             $lookup: {
        //                 from: "users",
        //                 localField: "adminId",
        //                 foreignField: "_id",
        //                 as: "adminDetails",
        //             },
        //         },
        //         {
        //             $lookup: {
        //                 from: "users",
        //                 localField: "userId",
        //                 foreignField: "_id",
        //                 as: "userDetails",
        //             },
        //         },
        //     ]);
        // } else {
        //     groups = await Group.aggregate([
        //         {
        //             $match: {
        //                 userId: existingUser._id,
        //             },
        //         },
        //         // {
        //         //     $lookup: {
        //         //         from: "users",
        //         //         localField: "adminId",
        //         //         foreignField: "_id",
        //         //         as: "adminDetails",
        //         //     },
        //         // },
        //         {
        //             $lookup: {
        //                 from: "users",
        //                 localField: "userId",
        //                 foreignField: "_id",
        //                 as: "userDetails",
        //             },
        //         },
        //     ]);
        // }

        // get details of group list
        // let groups = [];

        // if (existingUser.role === "Admin") {
        //     // Admin all groups he manages
        //     groups = await Group.find({
        //         adminId: existingUser._id,
        //     }).select("_id groupName adminId userId");
        // } else {
        //     // User only his group
        //     groups = await Group.find({
        //         userId: existingUser._id,
        //     }).select("_id groupName adminId userId");
        // }


        existingUser.lastLoginAt = new Date();
        await existingUser.save();

        return successResponse(
            res,
            {
                accessToken,
                refreshToken,
                // role: existingUser.role,
                // groups,
            },
            "User Login Successful"
        );
    } catch (error) {
        logger.error("Error During User Login", error);
        return errorResponse(res, error.message, "Login Failed", 500);
    }
};

exports.getMyGroups = async (req, res) => {
    try {
        // Decoded from token
        const userId = req.user.id;
        const role = req.user.role;

        let groups = [];

        if (role === "Admin") {
            groups = await Group.find({
                adminId: userId,
            }).select("_id groupName adminId userId");
        } else {
            groups = await Group.find({
                userId: userId,
            }).select("_id groupName adminId userId");
        }

        return res.json({
            status: true,
            role,
            data: groups,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            error: error.message,
        });
    }
};