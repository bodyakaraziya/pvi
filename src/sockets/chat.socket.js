const cookie = require("cookie");
const { verifyToken } = require("../middleware/auth.middleware");
const Student = require("../models/Student");
const {
    findRoomById,
    formatRoomForUser,
    createRoom,
    addRoomParticipants
} = require("../services/room.service");
const {
    getRoomMessages,
    findMessageById,
    createMessage,
    markRoomMessagesAsRead,
    editMessage,
    deleteMessage,
    toggleMessageReaction
} = require("../services/message.service");
const {
    createNotification,
    markRoomNotificationsAsRead
} = require("../services/notification.service");

const onlineUsers = new Map();
const activeRoomBySocket = new Map();

async function setUserStatus(userId, status) {
    await Student.updateOne(
        { id: userId },
        { $set: { status } }
    );
}

async function addOnlineSocket(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socketId);
    await setUserStatus(userId, "online");
}

async function removeOnlineSocket(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        return false;
    }

    const sockets = onlineUsers.get(userId);
    sockets.delete(socketId);

    if (sockets.size === 0) {
        onlineUsers.delete(userId);
        await setUserStatus(userId, "offline");
        return true;
    }

    return false;
}

function isUserActiveInRoom(userId, roomId) {
    const sockets = onlineUsers.get(userId);

    if (!sockets) {
        return false;
    }

    return [...sockets].some(socketId => activeRoomBySocket.get(socketId) === roomId);
}

async function emitRoomUpdate(io, room) {
    await Promise.all(room.participants.map(async participantId => {
        io.to(`user:${participantId}`).emit(
            "room:update",
            await formatRoomForUser(room, participantId)
        );
    }));
}

async function getMessageRoomForUser(messageId, userId) {
    const message = await findMessageById(messageId);

    if (!message) {
        return null;
    }

    const room = await findRoomById(message.roomId);

    if (!room || !room.participants.includes(userId)) {
        return null;
    }

    return room;
}

function registerChatSocket(io) {
    io.use((socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;

            if (!cookieHeader) {
                return next(new Error("Не авторизовано"));
            }

            const parsed = cookie.parse(cookieHeader);
            const token = parsed.token;

            if (!token) {
                return next(new Error("Не авторизовано"));
            }

            socket.user = verifyToken(token);

            if (!socket.user?.id) {
                return next(new Error("Invalid token payload"));
            }

            return next();
        } catch {
            return next(new Error("Недійсний токен"));
        }
    });

    io.on("connection", async socket => {
        const userId = socket.user.id;

        await addOnlineSocket(userId, socket.id);

        socket.join(`user:${userId}`);

        io.emit("user:status", {
            userId,
            status: "online"
        });

        socket.on("room:join", async ({ roomId }) => {
            const room = await findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const previousRoomId = activeRoomBySocket.get(socket.id);

            if (previousRoomId && previousRoomId !== roomId) {
                socket.leave(`room:${previousRoomId}`);
            }

            activeRoomBySocket.set(socket.id, roomId);
            socket.join(`room:${roomId}`);

            const updatedMessages = await markRoomMessagesAsRead(roomId, userId);
            await markRoomNotificationsAsRead(roomId, userId);

            const messages = await getRoomMessages(roomId);

            socket.emit("room:history", {
                roomId,
                messages
            });

            if (updatedMessages.length > 0) {
                io.to(`room:${roomId}`).emit("message:status:update", {
                    roomId,
                    messages: updatedMessages
                });
            }
        });

        socket.on("room:leave", ({ roomId }) => {
            const activeRoomId = activeRoomBySocket.get(socket.id);

            if (activeRoomId !== roomId) {
                return;
            }

            activeRoomBySocket.delete(socket.id);
            socket.leave(`room:${roomId}`);
        });

        socket.on("room:participants:add", async ({ roomId, participantIds }, callback) => {
            const result = await addRoomParticipants({
                roomId,
                participantIds: Array.isArray(participantIds) ? participantIds : [],
                requestedBy: userId
            });

            if (!result.success) {
                if (typeof callback === "function") {
                    callback(result);
                }

                return;
            }

            const room = await findRoomById(roomId);

            if (room) {
                await emitRoomUpdate(io, room);
            }

            if (typeof callback === "function") {
                callback(result);
            }
        });

        socket.on("room:create", async ({ name, participantIds }, callback) => {
            const result = await createRoom({
                name,
                participantIds: Array.isArray(participantIds) ? participantIds : [],
                createdBy: userId
            });

            if (!result.success) {
                if (typeof callback === "function") {
                    callback(result);
                }

                return;
            }

            const room = await findRoomById(result.room.id);

            if (room) {
                await emitRoomUpdate(io, room);
            }

            if (typeof callback === "function") {
                callback(result);
            }
        });

        socket.on("message:send", async ({ roomId, text }) => {
            const room = await findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const cleanText = String(text || "").trim();

            if (!cleanText) {
                return;
            }

            const message = await createMessage({
                roomId,
                senderId: userId,
                text: cleanText
            });

            const statusUpdates = [];

            for (const participantId of room.participants) {
                if (participantId === userId || !isUserActiveInRoom(participantId, roomId)) {
                    continue;
                }

                statusUpdates.push(...(await markRoomMessagesAsRead(roomId, participantId)));
            }

            const updatedCurrentMessage = statusUpdates.find(item => item.id === message.id);

            if (updatedCurrentMessage) {
                Object.assign(message, updatedCurrentMessage);
            }

            io.to(`room:${roomId}`).emit("message:new", message);
            await emitRoomUpdate(io, room);

            if (statusUpdates.length > 0) {
                io.to(`room:${roomId}`).emit("message:status:update", {
                    roomId,
                    messages: statusUpdates
                });
            }

            for (const participantId of room.participants) {
                if (participantId === userId) {
                    continue;
                }

                if (isUserActiveInRoom(participantId, roomId)) {
                    continue;
                }

                const notification = await createNotification({
                    recipientId: participantId,
                    roomId,
                    senderId: userId,
                    text: message.text
                });

                io.to(`user:${participantId}`).emit("notification:new", notification);
            }
        });

        socket.on("message:reaction", async ({ messageId, emoji }) => {
            const room = await getMessageRoomForUser(messageId, userId);

            if (!room) {
                return;
            }

            const result = await toggleMessageReaction({
                messageId,
                userId,
                emoji
            });

            if (!result.success) {
                return;
            }

            io.to(`room:${result.message.roomId}`).emit("message:update", result.message);
            await emitRoomUpdate(io, room);
        });

        socket.on("message:edit", async ({ messageId, text }) => {
            const room = await getMessageRoomForUser(messageId, userId);

            if (!room) {
                return;
            }

            const result = await editMessage({
                messageId,
                userId,
                text
            });

            if (!result.success) {
                socket.emit("message:error", {
                    message: result.message
                });
                return;
            }

            io.to(`room:${result.message.roomId}`).emit("message:update", result.message);
            await emitRoomUpdate(io, room);
        });

        socket.on("message:delete", async ({ messageId }) => {
            const room = await getMessageRoomForUser(messageId, userId);

            if (!room) {
                return;
            }

            const result = await deleteMessage({
                messageId,
                userId
            });

            if (!result.success) {
                socket.emit("message:error", {
                    message: result.message
                });
                return;
            }

            io.to(`room:${result.message.roomId}`).emit("message:update", result.message);
            await emitRoomUpdate(io, room);
        });

        socket.on("typing:start", async ({ roomId }) => {
            const room = await findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const userName = `${socket.user.firstName} ${socket.user.lastName || ""}`.trim();

            socket.to(`room:${roomId}`).emit("typing:start", {
                roomId,
                userId,
                userName
            });
        });

        socket.on("typing:stop", async ({ roomId }) => {
            const room = await findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            socket.to(`room:${roomId}`).emit("typing:stop", {
                roomId,
                userId
            });
        });

        socket.on("room:read", async ({ roomId }) => {
            const room = await findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const updatedMessages = await markRoomMessagesAsRead(roomId, userId);
            await markRoomNotificationsAsRead(roomId, userId);

            if (updatedMessages.length > 0) {
                io.to(`room:${roomId}`).emit("message:status:update", {
                    roomId,
                    messages: updatedMessages
                });
            }
        });

        socket.on("disconnect", async () => {
            activeRoomBySocket.delete(socket.id);

            const becameOffline = await removeOnlineSocket(userId, socket.id);

            if (becameOffline) {
                io.emit("user:status", {
                    userId,
                    status: "offline"
                });
            }
        });
    });
}

module.exports = registerChatSocket;
