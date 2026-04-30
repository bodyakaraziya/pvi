const cookie = require("cookie");
const { verifyToken } = require("../middleware/auth.middleware");
const memoryStore = require("../data/memoryStore");
const { findRoomById, formatRoomForUser } = require("../services/room.service");
const {
    getRoomMessages,
    createMessage,
    markRoomMessagesAsRead
} = require("../services/message.service");
const {
    createNotification,
    markRoomNotificationsAsRead
} = require("../services/notification.service");

const onlineUsers = new Map();
const activeRoomBySocket = new Map();

function setUserStatus(userId, status) {
    const user = memoryStore.students.find(student => student.id === userId);

    if (user) {
        user.status = status;
    }
}

function addOnlineSocket(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socketId);
    setUserStatus(userId, "online");
}

function removeOnlineSocket(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        return false;
    }

    const sockets = onlineUsers.get(userId);
    sockets.delete(socketId);

    if (sockets.size === 0) {
        onlineUsers.delete(userId);
        setUserStatus(userId, "offline");
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

function emitRoomUpdate(io, room) {
    room.participants.forEach(participantId => {
        io.to(`user:${participantId}`).emit(
            "room:update",
            formatRoomForUser(room, participantId)
        );
    });
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

    io.on("connection", socket => {
        const userId = socket.user.id;

        addOnlineSocket(userId, socket.id);

        socket.join(`user:${userId}`);

        io.emit("user:status", {
            userId,
            status: "online"
        });

        socket.on("room:join", ({ roomId }) => {
            const room = findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const previousRoomId = activeRoomBySocket.get(socket.id);

            if (previousRoomId && previousRoomId !== roomId) {
                socket.leave(`room:${previousRoomId}`);
            }

            activeRoomBySocket.set(socket.id, roomId);
            socket.join(`room:${roomId}`);

            const updatedMessages = markRoomMessagesAsRead(roomId, userId);
            markRoomNotificationsAsRead(roomId, userId);

            const messages = getRoomMessages(roomId);

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

        socket.on("message:send", ({ roomId, text }) => {
            const room = findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const cleanText = String(text || "").trim();

            if (!cleanText) {
                return;
            }

            const message = createMessage({
                roomId,
                senderId: userId,
                text: cleanText
            });

            const statusUpdates = [];

            room.participants.forEach(participantId => {
                if (participantId === userId || !isUserActiveInRoom(participantId, roomId)) {
                    return;
                }

                statusUpdates.push(...markRoomMessagesAsRead(roomId, participantId));
            });

            const updatedCurrentMessage = statusUpdates.find(item => item.id === message.id);

            if (updatedCurrentMessage) {
                Object.assign(message, updatedCurrentMessage);
            }

            io.to(`room:${roomId}`).emit("message:new", message);
            emitRoomUpdate(io, room);

            if (statusUpdates.length > 0) {
                io.to(`room:${roomId}`).emit("message:status:update", {
                    roomId,
                    messages: statusUpdates
                });
            }

            room.participants.forEach(participantId => {
                if (participantId === userId) {
                    return;
                }

                if (isUserActiveInRoom(participantId, roomId)) {
                    return;
                }

                const notification = createNotification({
                    recipientId: participantId,
                    roomId,
                    senderId: userId,
                    text: message.text
                });

                io.to(`user:${participantId}`).emit("notification:new", notification);
            });
        });

        socket.on("typing:start", ({ roomId }) => {
            const room = findRoomById(roomId);

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

        socket.on("typing:stop", ({ roomId }) => {
            const room = findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            socket.to(`room:${roomId}`).emit("typing:stop", {
                roomId,
                userId
            });
        });

        socket.on("room:read", ({ roomId }) => {
            const room = findRoomById(roomId);

            if (!room || !room.participants.includes(userId)) {
                return;
            }

            const updatedMessages = markRoomMessagesAsRead(roomId, userId);
            markRoomNotificationsAsRead(roomId, userId);

            if (updatedMessages.length > 0) {
                io.to(`room:${roomId}`).emit("message:status:update", {
                    roomId,
                    messages: updatedMessages
                });
            }
        });

        socket.on("disconnect", () => {
            activeRoomBySocket.delete(socket.id);

            const becameOffline = removeOnlineSocket(userId, socket.id);

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
