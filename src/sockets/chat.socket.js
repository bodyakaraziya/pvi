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

// userId -> Set(socketId): один користувач може мати кілька відкритих вкладок.
const onlineUsers = new Map();
// socketId -> roomId: показує, який чат реально відкритий у конкретній вкладці.
const activeRoomBySocket = new Map();

async function setUserStatus(userId, status) {
    await Student.updateOne(
        { id: userId },
        { $set: { status } }
    );
}

async function addOnlineSocket(userId, socketId) {
    // Перший активний socket робить користувача online.
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

    // Offline ставимо тільки після закриття останньої вкладки користувача.
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
    // Кожен учасник отримує кімнату у власному форматі, бо назва direct-чату персональна.
    await Promise.all(room.participants.map(async participantId => {
        io.to(`user:${participantId}`).emit(
            "room:update",
            await formatRoomForUser(room, participantId)
        );
    }));
}

async function getMessageRoomForUser(messageId, userId) {
    // Перед реакціями/редагуванням/видаленням перевіряємо, що користувач належить до кімнати.
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
    // Socket.IO теж авторизується через cookie з JWT, як і звичайні HTTP-запити.
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

        // Персональна кімната user:<id> потрібна для приватних оновлень і сповіщень.
        await addOnlineSocket(userId, socket.id);

        socket.join(`user:${userId}`);

        io.emit("user:status", {
            userId,
            status: "online"
        });

        socket.on("room:join", async ({ roomId }) => {
            // Користувач може зайти тільки в кімнату, де він є учасником.
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

            // При відкритті кімнати всі її повідомлення та сповіщення вважаються прочитаними.
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
            // callback повертає результат саме тому клієнту, який ініціював додавання.
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
            // Створення через socket дає realtime-оновлення всім учасникам без перезавантаження.
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
            // Будь-яка дія з повідомленням починається з перевірки доступу до кімнати.
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

            // Якщо отримувач зараз дивиться цю кімнату, повідомлення одразу стає прочитаним.
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

                // Сповіщення створюємо тільки для тих, хто не має цей чат відкритим.
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
            // Реакції broadcast-яться всій кімнаті, бо змінюють стан конкретного повідомлення.
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
            // Service-шар додатково перевіряє, що редагує саме автор повідомлення.
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
            // Видалення м'яке: повідомлення лишається в історії, але текст замінюється.
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
            // Typing-події не зберігаються в базі, а лише тимчасово транслюються іншим учасникам.
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
            // Клієнт викликає це після відкриття кімнати або отримання нового повідомлення.
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
