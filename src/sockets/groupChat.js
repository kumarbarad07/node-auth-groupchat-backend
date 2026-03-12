
const GroupChat = require("../models/GroupChat");
const Group = require("../models/Group");
const jwt = require("jsonwebtoken");
const GroupMember = require("../models/GroupMember");
const mongoose = require("mongoose");
const User = require("../models/UserAccount");
const secretKey = process.env.JWT_SECRET;
// const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET;

module.exports = (io) => {
  // Global Online Users Map (userId -> socketId)
  const onlineUsers = new Map();
  const activeGroupUsers = new Map();   // groupId -> Set(userId)

  // Middleware to verify token
  // io.use(async (socket, next) => {
  //   try {
  //     const token =
  //       socket.handshake.auth?.token ||
  //       socket.handshake.query?.token;

  //     if (!token) {
  //       return next(new Error("No token provided"));
  //     }

  //     const decoded = jwt.verify(token, secretKey);

  //     socket.userId = decoded.id;

  //     next();
  //   } catch (err) {
  //     next(new Error("Invalid token"));
  //   }
  // });

  io.use((socket, next) => {
    try {
      let token;

      // 1️ From headers.token (supports both "Bearer token" and plain token)
      if (socket.handshake.headers.token) {
        const headerToken = socket.handshake.headers.token;
        token = headerToken.startsWith("Bearer ") 
          ? headerToken.split(" ")[1] 
          : headerToken;
      }

      // 2️ From query 
      else if (socket.handshake.query?.token) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, secretKey);
      socket.user = decoded;

      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = String(socket.user?.id);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    // console.log("User connected:", socket.id);
    console.log("User Connected", userId);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    // 1 mark user Online
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: null
    });

    console.log("User marked ONLINE in DB");


    // 2️ Get groups where user is member
    const memberships = await GroupMember.find({
      userId: userObjectId
    }).select("groupId");

    const groupIds = memberships.map(m => m.groupId);

    // 3️ Find messages that were SENT but not delivered to this user
    const undeliveredMessages = await GroupChat.find({
      groupId: { $in: groupIds },
      deliveredTo: { $ne: userObjectId },
      senderId: { $ne: userObjectId },
      status: "sent"
    });

    // 4️ Update those messages
    if (undeliveredMessages.length > 0) {

      await GroupChat.updateMany(
        {
          groupId: { $in: groupIds },
          deliveredTo: { $ne: userObjectId },
          senderId: { $ne: userObjectId },
          status: "sent"
        },
        {
          $addToSet: { deliveredTo: userObjectId },
          $set: { status: "delivered" }
        }
      );

      console.log("Updated old messages to delivered");
    }


    // socket.on("userOnline", (userId) => {
    //   // onlineUsers.set(userId.toString(), socket.id);
    //   // console.log("User online:", userId);
    //   const userIdStr = userId.toString();
    //   onlineUsers.set(userIdStr, socket.id);
    //   console.log("User online:", userIdStr);
    //   console.log("Online Users Map:", onlineUsers);
    // });


    // socket.on("joinGroup", ({ groupId }) => {
    //   socket.join(`group_${groupId}`);
    //   console.log("Joined group:", groupId);
    // });

    // socket.on("userOnline", async (userId) => {
    //   try {
    //     if (!userId) return;

    //     const userIdStr = String(userId);
    //     onlineUsers.set(userIdStr, socket.id);

    //     console.log("User online:", userIdStr);

    //     const userObjectId = new mongoose.Types.ObjectId(userIdStr);

    //     // Find messages not yet delivered to this user
    //     await GroupChat.updateMany(
    //       {
    //         senderId: { $ne: userObjectId },
    //         deliveredTo: { $ne: userObjectId }
    //       },
    //       {
    //         $addToSet: { deliveredTo: userObjectId },
    //         $set: { status: "delivered" }
    //       }
    //     );

    //     console.log("Pending messages marked delivered for:", userIdStr);

    //   } catch (err) {
    //     console.log("UserOnline Error:", err.message);
    //   }
    // });

    socket.on("userOnline", async (userId) => {
      try {
        if (!userId) return;

        const userIdStr = String(userId);
        onlineUsers.set(userIdStr, socket.id);

        console.log("User online:", userIdStr);

        const userObjectId = new mongoose.Types.ObjectId(userIdStr);

        //  1️ Update lastSeenAt for ALL groups this user belongs to
        await GroupMember.updateMany(
          { userId: userObjectId },
          { $set: { lastSeenAt: new Date() } }
        );

        console.log("Updated lastSeenAt for user:", userIdStr);

        //  2️ Mark undelivered messages as delivered
        await GroupChat.updateMany(
          {
            senderId: { $ne: userObjectId },
            deliveredTo: { $ne: userObjectId }
          },
          {
            $addToSet: { deliveredTo: userObjectId },
            $set: { status: "delivered" }
          }
        );

        console.log("Pending messages marked delivered for:", userIdStr);

      } catch (err) {
        console.log("UserOnline Error:", err.message);
      }
    });

    // socket.on("joinGroup", async ({ groupId, userId }) => {
    //   try {
    //     if (!groupId || !userId) return;

    //     socket.join(`group_${groupId}`);
    //     console.log("Joined group:", groupId);

    //     const userObjectId = new mongoose.Types.ObjectId(userId);
    //     const groupObjectId = new mongoose.Types.ObjectId(groupId);

    //     // Reset unread count
    //     await GroupMember.findOneAndUpdate(
    //       { groupId: groupObjectId, userId: userObjectId },
    //       { unreadCount: 0, lastSeenAt: new Date() }
    //     );

    //     // Mark messages as seen
    //     await GroupChat.updateMany(
    //       {
    //         groupId: groupObjectId,
    //         senderId: { $ne: userObjectId }
    //       },
    //       {
    //         $addToSet: { seenBy: userObjectId }
    //       }
    //     );

    //     io.to(`group_${groupId}`).emit("messageSeenUpdate", {
    //       groupId,
    //       userId
    //     });

    //   } catch (err) {
    //     console.log("Join Group Error:", err.message);
    //   }
    // });

    // socket.on("joinGroup", async ({ groupId, userId }) => {
    //   try {
    //     if (!groupId || !userId) return;

    //     socket.join(`group_${groupId}`);
    //     console.log("Joined group:", groupId);

    //     //
    //     const groupIdStr = String(groupId);
    //     const userIdStr = String(userId);

    //     // Track active users in group
    //     if (!activeGroupUsers.has(groupIdStr)) {
    //       activeGroupUsers.set(groupIdStr, new Set());
    //     }
    //     activeGroupUsers.get(groupIdStr).add(userIdStr);

    //     console.log(`User ${userIdStr} joined group ${groupIdStr}`);

    //     const userObjectId = new mongoose.Types.ObjectId(userId);
    //     const groupObjectId = new mongoose.Types.ObjectId(groupId);

    //     // 1️⃣ Reset unread count & update lastSeenAt
    //     await GroupMember.findOneAndUpdate(
    //       { groupId: groupObjectId, userId: userObjectId },
    //       {
    //         $set: {
    //           unreadCount: 0,
    //           lastSeenAt: new Date()
    //         }
    //       }
    //     );

    //     // 2️⃣ Mark messages as seen
    //     await GroupChat.updateMany(
    //       {
    //         groupId: groupObjectId,
    //         senderId: { $ne: userObjectId }
    //       },
    //       {
    //         $addToSet: { seenBy: userObjectId }
    //       }
    //     );

    //     // 3️⃣ Emit seen update
    //     io.to(`group_${groupId}`).emit("messageSeenUpdate", {
    //       groupId,
    //       userId
    //     });

    //   } catch (err) {
    //     console.log("Join Group Error:", err.message);
    //   }
    // });

    socket.on("joinGroup", async ({ groupId, userId }) => {
      try {
        if (!groupId || !userId) return;

        const groupIdStr = String(groupId);
        const userIdStr = String(userId);

        socket.userId = userIdStr;

        //  Leave previous active group
        if (socket.activeGroupId) {
          const oldGroupSet =
            activeGroupUsers.get(socket.activeGroupId);

          if (oldGroupSet) {
            oldGroupSet.delete(userIdStr);
          }
        }

        // Join new socket room
        socket.join(`group_${groupId}`);

        socket.activeGroupId = groupIdStr;

        // Track active users per group
        if (!activeGroupUsers.has(groupIdStr)) {
          activeGroupUsers.set(groupIdStr, new Set());
        }

        activeGroupUsers.get(groupIdStr).add(userIdStr);

        console.log(`User ${userIdStr} active in group ${groupIdStr}`);

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const groupObjectId = new mongoose.Types.ObjectId(groupId);

        // Reset unread count
        await GroupMember.updateOne(
          { groupId: groupObjectId, userId: userObjectId },
          {
            $set: {
              unreadCount: 0,
              lastSeenAt: new Date(),
            },
          }
        );

        // Mark existing messages as seen
        await GroupChat.updateMany(
          {
            groupId: groupObjectId,
            senderId: { $ne: userObjectId },
          },
          {
            $addToSet: { seenBy: userObjectId },
          }
        );

        io.to(`group_${groupId}`).emit("messageSeenUpdate", {
          groupId,
          userId,
        });

      } catch (err) {
        console.log("Join Group Error:", err.message);
      }
    });

    socket.on("getGroups", async (data = {}) => {
      try {
        const { token, page = 1, limit = 10 } = data;
        if (!token) {
          return socket.emit("getGroupsError", {
            message: "Token missing",
          });
        }

        // VERIFY TOKEN
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        console.log("Decoded:", decoded);

        const userId = decoded.id;
        const role = decoded.role;   //  role from token

        // PAGINATION CALCULATION
        const skip = (page - 1) * limit;

        console.log("UserId:", userId);
        console.log("Role:", role);

        let groups = [];

        //  ADMIN GROUPS
        if (role === "Admin") {
          groups = await Group.find({
            adminId: userId,
          })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

          console.log(
            `Admin groups found: ${groups.length}`
          );
        }

        //  USER GROUPS
        else {
          groups = await Group.find({
            "members.userId": userId,
          })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

          console.log(
            `User groups found: ${groups.length}`
          );
        }

        // RETURN DIRECTLY TO SENDER
        socket.emit("getGroups", {
          groups,
          pagination: {
            page: Number(page),
            limit: Number(limit),
          },
        });

      } catch (err) {
        console.log(
          "GetGroups Socket Error:",
          err.message
        );

        socket.emit("getGroupsError", {
          message: "Failed to fetch groups",
        });
      }
    });

    // get messages
    socket.on("getGroupMessages", async (data = {}) => {
      try {
        const { groupId, page = 1, limit = 10 } = data;
        if (!groupId) {
          return socket.emit("getMessagesError", {
            message: "Group Id missing",
          });
        }


        // PAGINATION CALCULATION
        const skip = (page - 1) * limit;

        let groups = [];

        //  ADMIN GROUPS
        if (groupId) {
          groups = await GroupChat.find({
            groupId: groupId,
          })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

          console.log(
            `Chats Found: ${groups.length}`
          );
        }


        // RETURN DIRECTLY TO SENDER
        socket.emit("getGroupMessages", {
          groups,
          pagination: {
            // total: totalGroups,
            page: Number(page),
            limit: Number(limit),
            // totalPages: Math.ceil(
            //   totalGroups / limit
            // ),
          },
        });

      } catch (err) {
        console.log(
          "GetGroups Socket Error:",
          err.message
        );

        socket.emit("getGroupsError", {
          message: "Failed to fetch groups",
        });
      }
    });

    // socket.on("sendGroupMessage", async (data) => {
    //   try {
    //     console.log("Incoming Data:", data);

    //     const {
    //       groupId,
    //       senderId,
    //       text,
    //       imagePath,
    //     } = data;

    //     const message = await GroupChat.create({
    //       groupId,
    //       senderId,
    //       text,
    //       imagePath,
    //     });

    //     const newMessage = await Message.create({
    //       groupId,
    //       senderId,
    //       text,
    //     });

    //     console.log("Saved Message:", message);

    //     // EMIT MESSAGE TO GROUP
    //     io.to(`group_${groupId}`).emit(
    //       "receiveGroupMessage",
    //       message
    //     );
    //   } catch (err) {
    //     console.log("Socket Error:", err);
    //   }
    // });

    // socket.on("sendGroupMessage", async (data) => {
    //   try {
    //     console.log("Incoming Data:", data);

    //     const {
    //       groupId,
    //       senderId,
    //       text,
    //       imagePath,
    //     } = data;

    //     // 1️ Save message (use ONE model only)
    //     // const message = await GroupChat.create({
    //     //   groupId,
    //     //   senderId,
    //     //   text,
    //     //   imagePath,
    //     // });

    //     // 1️⃣ Get group members
    //     const members = await GroupMember.find({ groupId });

    //     const memberIds = members.map(m => m.userId.toString());

    //     // 2️⃣ Check who is online (you must track online users globally)
    //     const onlineUsers = Array.from(io.sockets.adapter.rooms.get(`group_${groupId}`) || []);

    //     const deliveredTo = [];
    //     const seenBy = [];

    //     // 3️⃣ Determine delivered users
    //     members.forEach(member => {
    //       const userIdStr = member.userId.toString();

    //       if (userIdStr !== senderId) {
    //         deliveredTo.push(member.userId);
    //       }
    //     });

    //     // 4️⃣ Save message
    //     const message = await GroupChat.create({
    //       groupId,
    //       senderId,
    //       text,
    //       imagePath,
    //       status: deliveredTo.length > 0 ? "delivered" : "sent",
    //       deliveredTo,
    //       seenBy: [senderId], // sender automatically seen
    //     });

    //     // 2️ Update group last activity
    //     await Group.findByIdAndUpdate(groupId, {
    //       lastMessage: text,
    //       lastMessageAt: new Date(),
    //     });

    //     // (3) Increase unread for others
    //     await GroupMember.updateMany(
    //       {
    //         groupId: groupId,
    //         userId: { $ne: senderId },
    //       },
    //       { $inc: { unreadCount: 1 } }
    //     );

    //     // 3️ Get updated group minimal info
    //     const updatedGroup = await Group.findById(groupId)
    //       .select("_id groupName updatedAt");

    //     // 4️ Emit message to group room
    //     io.to(`group_${groupId}`).emit(
    //       "receiveGroupMessage",
    //       message
    //     );

    //     // 5️ Emit group update for reordering
    //     io.to(`group_${groupId}`).emit(
    //       "groupUpdated",
    //       updatedGroup
    //     );

    //     // 6 Increase unread count for all members except sender

    //     // const members = await GroupMember.find({
    //     //   groupId: groupId,
    //     //   userId: { $ne: senderId }
    //     // });

    //     // const bulkOps = members.map(member => ({
    //     //   updateOne: {
    //     //     filter: { _id: member._id },
    //     //     update: { $inc: { unreadCount: 1 } }
    //     //   }
    //     // }));

    //     // if (bulkOps.length > 0) {
    //     //   await GroupMember.bulkWrite(bulkOps);
    //     // }

    //   } catch (err) {
    //     console.log("Socket Error:", err.message);
    //   }
    // });

    // socket.on("sendGroupMessage", async (data) => {
    //   try {
    //     const { groupId, senderId, text, imagePath } = data;

    //     if (!groupId || !senderId) return;

    //     const groupObjectId = new mongoose.Types.ObjectId(groupId);
    //     const senderObjectId = new mongoose.Types.ObjectId(senderId);
    //     const senderIdStr = String(senderId);
    //     const groupIdStr = String(groupId);

    //     // Get members
    //     const members = await GroupMember.find({ groupId: groupObjectId });

    //     let deliveredTo = [];
    //     let isDelivered = false;

    //     members.forEach(member => {
    //       const memberIdStr = String(member.userId);

    //       if (
    //         memberIdStr !== senderIdStr &&
    //         onlineUsers.has(memberIdStr)
    //       ) {
    //         deliveredTo.push(member.userId);
    //         isDelivered = true;
    //       }
    //     });

    //     // Save message with correct status
    //     const message = await GroupChat.create({
    //       groupId: groupObjectId,
    //       senderId: senderObjectId,
    //       text,
    //       imagePath,
    //       status: isDelivered ? "delivered" : "sent",
    //       deliveredTo,
    //       seenBy: [senderObjectId]
    //     });

    //     // Update group last activity
    //     await Group.findByIdAndUpdate(groupObjectId, {
    //       lastMessage: text,
    //       lastMessageAt: new Date(),
    //     });

    //     await GroupMember.updateMany(
    //       { userId: senderId },
    //       { $set: { lastSeenAt: new Date() } }
    //     );

    //     // Increase unread for offline users
    //     // const offlineUserIds = members
    //     //   .filter(member => {
    //     //     const memberIdStr = String(member.userId);
    //     //     return (
    //     //       memberIdStr !== senderIdStr &&
    //     //       !onlineUsers.has(memberIdStr)
    //     //     );
    //     //   })
    //     //   .map(member => member.userId);

    //     // if (offlineUserIds.length > 0) {
    //     //   await GroupMember.updateMany(
    //     //     {
    //     //       groupId: groupObjectId,
    //     //       userId: { $in: offlineUserIds }
    //     //     },
    //     //     { $inc: { unreadCount: 1 } }
    //     //   );
    //     // }

    //     // ===============================
    //     //  UNREAD COUNT LOGIC
    //     // ===============================
    //     const activeUsersInGroup = activeGroupUsers.get(groupIdStr) || new Set();

    //     const usersToIncrease = members
    //       .filter(member => {
    //         const memberIdStr = String(member.userId);

    //         return (
    //           memberIdStr !== senderIdStr &&          // not sender
    //           !activeUsersInGroup.has(memberIdStr)   // not inside group
    //         );
    //       })
    //       .map(member => member.userId);

    //     if (usersToIncrease.length > 0) {
    //       await GroupMember.updateMany(
    //         {
    //           groupId: groupObjectId,
    //           userId: { $in: usersToIncrease }
    //         },
    //         { $inc: { unreadCount: 1 } }
    //       );
    //     }

    //     // Emit message
    //     io.to(`group_${groupId}`).emit("receiveGroupMessage", message);

    //     // Emit group update
    //     const updatedGroup = await Group.findById(groupObjectId)
    //       .select("_id groupName lastMessageAt");

    //     io.to(`group_${groupId}`).emit("groupUpdated", updatedGroup);

    //     console.log("Message Status:", message.status);

    //   } catch (err) {
    //     console.log("Socket Error:", err.message);
    //   }
    // });

    // socket.on("sendGroupMessage", async (data) => {
    //   try {
    //     const { groupId, senderId, text, imagePath } = data;

    //     if (!groupId || !senderId) return;

    //     const groupObjectId = new mongoose.Types.ObjectId(groupId);
    //     const senderObjectId = new mongoose.Types.ObjectId(senderId);
    //     const senderIdStr = String(senderId);
    //     const groupIdStr = String(groupId);

    //     //  Get all group members
    //     const members = await GroupMember.find({ groupId: groupObjectId });

    //     const activeUsersInGroup =
    //       activeGroupUsers.get(groupIdStr) || new Set();

    //     let deliveredTo = [];
    //     let seenBy = [senderObjectId];
    //     let isDelivered = false;

    //     // ======================================
    //     //  DELIVERY + SEEN LOGIC
    //     // ======================================
    //     members.forEach((member) => {
    //       const memberIdStr = String(member.userId);

    //       // Skip sender
    //       if (memberIdStr === senderIdStr) return;

    //       //  If user is inside group → SEEN
    //       if (activeUsersInGroup.has(memberIdStr)) {
    //         seenBy.push(member.userId);
    //         deliveredTo.push(member.userId);
    //         isDelivered = true;
    //       }

    //       //  If user is online but not inside group → DELIVERED
    //       else if (onlineUsers.has(memberIdStr)) {
    //         deliveredTo.push(member.userId);
    //         isDelivered = true;
    //       }
    //     });

    //     // ======================================
    //     //  CREATE MESSAGE
    //     // ======================================
    //     const message = await GroupChat.create({
    //       groupId: groupObjectId,
    //       senderId: senderObjectId,
    //       text,
    //       imagePath,
    //       status: isDelivered ? "delivered" : "sent",
    //       deliveredTo,
    //       seenBy,
    //     });

    //     // ======================================
    //     //  UPDATE GROUP LAST MESSAGE
    //     // ======================================
    //     await Group.findByIdAndUpdate(groupObjectId, {
    //       lastMessage: text,
    //       lastMessageAt: new Date(),
    //     });

    //     // ======================================
    //     //  UPDATE SENDER LAST SEEN
    //     // ======================================
    //     await GroupMember.updateOne(
    //       { groupId: groupObjectId, userId: senderObjectId },
    //       { $set: { lastSeenAt: new Date() } }
    //     );

    //     // ======================================
    //     //  UNREAD COUNT LOGIC
    //     // ======================================
    //     const usersToIncrease = members
    //       .filter((member) => {
    //         const memberIdStr = String(member.userId);

    //         return (
    //           memberIdStr !== senderIdStr &&            // not sender
    //           !activeUsersInGroup.has(memberIdStr)     // not inside group
    //         );
    //       })
    //       .map((member) => member.userId);

    //     if (usersToIncrease.length > 0) {
    //       await GroupMember.updateMany(
    //         {
    //           groupId: groupObjectId,
    //           userId: { $in: usersToIncrease },
    //         },
    //         { $inc: { unreadCount: 1 } }
    //       );
    //     }

    //     // ======================================
    //     //  EMIT MESSAGE
    //     // ======================================
    //     io.to(`group_${groupId}`).emit("receiveGroupMessage", message);

    //     // ======================================
    //     //  EMIT GROUP UPDATE
    //     // ======================================
    //     const updatedGroup = await Group.findById(groupObjectId)
    //       .select("_id groupName lastMessage lastMessageAt");

    //     io.to(`group_${groupId}`).emit("groupUpdated", updatedGroup);

    //     console.log("Message Status:", message.status);

    //   } catch (err) {
    //     console.log("Socket Error:", err.message);
    //   }
    // });

    socket.on("sendGroupMessage", async (data) => {
      try {
        const { groupId, senderId, text, imagePath } = data;
        if (!groupId || !senderId) return;

        const groupObjectId = new mongoose.Types.ObjectId(groupId);
        const senderObjectId = new mongoose.Types.ObjectId(senderId);

        const senderIdStr = String(senderId);
        const groupIdStr = String(groupId);

        const members = await GroupMember.find({
          groupId: groupObjectId,
        });

        // const activeUsersInGroup =
        //   activeGroupUsers.get(groupIdStr) || new Set();

        // let deliveredTo = [];
        // let seenBy = [senderObjectId];
        // let isDelivered = false;

        // //  DELIVERY + SEEN LOGIC
        // members.forEach((member) => {
        //   const memberIdStr = String(member.userId);

        //   if (memberIdStr === senderIdStr) return;

        //   // If user is currently viewing THIS group
        //   if (activeUsersInGroup.has(memberIdStr)) {
        //     seenBy.push(member.userId);
        //     deliveredTo.push(member.userId);
        //     isDelivered = true;
        //   }

        //   // If user online but not viewing this group
        //   else if (onlineUsers.has(memberIdStr)) {
        //     deliveredTo.push(member.userId);
        //     isDelivered = true;
        //   }
        // });

        //  DELIVERY + SEEN LOGIC (FINAL CORRECT VERSION)

        const activeUsersInGroup =
          activeGroupUsers.get(groupIdStr) || new Set();

        const userIds = members
          .map(m => m.userId)
          .filter(id => String(id) !== senderIdStr);

        // Get users from DB
        const users = await User.find({
          _id: { $in: userIds }
        }).select("_id isOnline lastSeen");

        let deliveredTo = [];
        let seenBy = [senderObjectId];
        let isDelivered = false;

        users.forEach(user => {

          const memberIdStr = String(user._id);

          //  CASE 1: User currently viewing THIS group
          if (activeUsersInGroup.has(memberIdStr)) {

            seenBy.push(user._id);
            deliveredTo.push(user._id);
            isDelivered = true;
          }

          //  CASE 2: User online but NOT viewing this group
          else if (user.isOnline === true && user.lastSeen === null) {

            deliveredTo.push(user._id);
            isDelivered = true;
          }

          //  CASE 3: Offline → nothing
        });

        const message = await GroupChat.create({
          groupId: groupObjectId,
          senderId: senderObjectId,
          text,
          imagePath,
          status: isDelivered ? "delivered" : "sent",
          deliveredTo,
          seenBy,
        });

        await Group.findByIdAndUpdate(groupObjectId, {
          lastMessage: text,
          lastMessageAt: new Date(),
        });

        // Update sender lastSeen
        await GroupMember.updateOne(
          { groupId: groupObjectId, userId: senderObjectId },
          { $set: { lastSeenAt: new Date() } }
        );

        //  UNREAD COUNT LOGIC
        const usersToIncrease = members
          .filter((member) => {
            const memberIdStr = String(member.userId);

            return (
              memberIdStr !== senderIdStr &&
              !activeUsersInGroup.has(memberIdStr)
            );
          })
          .map((member) => member.userId);

        if (usersToIncrease.length > 0) {
          await GroupMember.updateMany(
            {
              groupId: groupObjectId,
              userId: { $in: usersToIncrease },
            },
            { $inc: { unreadCount: 1 } }
          );
        }

        io.to(`group_${groupId}`).emit(
          "receiveGroupMessage",
          message
        );

        const updatedGroup = await Group.findById(groupObjectId)
          .select("_id groupName lastMessage lastMessageAt");

        io.to(`group_${groupId}`).emit(
          "groupUpdated",
          updatedGroup
        );

      } catch (err) {
        console.log("Socket Error:", err.message);
      }
    });

    // socket.on("disconnect", () => {
    //   for (let [userId, socketId] of onlineUsers.entries()) {
    //     if (socketId === socket.id) {
    //       onlineUsers.delete(userId);
    //       console.log("User offline:", userId);
    //       break;
    //     }
    //   }

    process.on("SIGINT", async () => {
      console.log("Server shutting down...");

      try {
        await User.updateMany(
          { isOnline: true },
          { isOnline: false }
        );

        console.log("All users marked offline.");
      } catch (err) {
        console.error("Error updating users:", err);
      }

      process.exit();
    });

    socket.on("disconnect", async () => {
      const userId = socket.user?.id;

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });


      if (userId) {
        onlineUsers.delete(userId);
      }

      if (socket.activeGroupId && userId) {
        const groupSet =
          activeGroupUsers.get(socket.activeGroupId);

        if (groupSet) {
          groupSet.delete(userId);
        }
      }

      console.log("User disconnected:", userId);

      // Remove user from active groups
      activeGroupUsers.forEach((usersSet) => {
        for (let userId of usersSet) {
          if (!onlineUsers.has(userId)) {
            usersSet.delete(userId);
          }
        }
      });
    });

  });
};

