const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");
const Message = require("../models/Message");
const Room = require("../models/Room");
const Student = require("../models/Student");

// Стартові студенти потрібні для коректного відображення імен авторів повідомлень.
async function ensureInitialStudents() {
    await Student.seedInitial(memoryStore.students);
}

async function getSenderName(senderId) {
    await ensureInitialStudents();

    const sender = await Student.findOne({ id: senderId }).lean();

    return sender
        ? `${sender.firstName} ${sender.lastName || ""}`.trim()
        : "Unknown";
}

async function findMessageRoom(roomId) {
    return Room.findOne({ id: roomId }).lean();
}

// Статус "read" ставиться тільки тоді, коли всі отримувачі повідомлення прочитали його.
async function calculateMessageStatus(message) {
    const room = await findMessageRoom(message.roomId);

    if (!room) {
        return "sent";
    }

    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const recipients = room.participants.filter(participantId => {
        return participantId !== message.senderId;
    });

    const allRecipientsRead = recipients.every(participantId => {
        return readBy.includes(participantId);
    });

    return allRecipientsRead ? "read" : "sent";
}

// Mongoose Map і звичайний object мають різний вигляд, тому приводимо реакції до одного формату.
function getReactionEntries(reactions = {}) {
    if (reactions instanceof Map) {
        return [...reactions.entries()];
    }

    return Object.entries(reactions || {});
}

function getReactionObject(reactions = {}) {
    return Object.fromEntries(getReactionEntries(reactions));
}

function normalizeDate(date) {
    if (!date) {
        return null;
    }

    return date instanceof Date ? date.toISOString() : date;
}

// API повертає реакції списком із кількістю та користувачами, щоб UI міг швидко їх намалювати.
function normalizeReactions(reactions = {}) {
    return getReactionEntries(reactions)
        .map(([emoji, userIds]) => {
            const uniqueUserIds = [...new Set(Array.isArray(userIds) ? userIds : [])];

            return {
                emoji,
                count: uniqueUserIds.length,
                userIds: uniqueUserIds
            };
        })
        .filter(reaction => reaction.count > 0);
}

function toPlainMessage(message) {
    if (!message) {
        return null;
    }

    if (typeof message.toObject === "function") {
        return message.toObject({
            flattenMaps: true
        });
    }

    return {
        ...message,
        reactions: getReactionObject(message.reactions)
    };
}

// Нормалізація приховує технічні поля MongoDB і однаково форматує повідомлення для HTTP та Socket.IO.
async function normalizeMessage(message) {
    const plainMessage = toPlainMessage(message);
    const readBy = Array.isArray(plainMessage.readBy) ? [...plainMessage.readBy] : [];
    const senderName = plainMessage.senderName || await getSenderName(plainMessage.senderId);
    const isDeleted = Boolean(plainMessage.deletedAt);
    const status = await calculateMessageStatus({
        ...plainMessage,
        readBy,
        senderName
    });

    return {
        id: plainMessage.id,
        roomId: plainMessage.roomId,
        senderId: plainMessage.senderId,
        senderName,
        text: isDeleted ? "Повідомлення видалено" : plainMessage.text,
        status,
        readBy: [...readBy],
        createdAt: normalizeDate(plainMessage.createdAt),
        editedAt: normalizeDate(plainMessage.editedAt),
        deletedAt: normalizeDate(plainMessage.deletedAt),
        reactions: normalizeReactions(plainMessage.reactions)
    };
}

async function getRoomMessages(roomId) {
    const messages = await Message.find({ roomId })
        .sort({ createdAt: 1, _id: 1 })
        .lean();

    return Promise.all(messages.map(normalizeMessage));
}

async function getLastRoomMessage(roomId) {
    const lastMessage = await Message.findOne({ roomId })
        .sort({ createdAt: -1, _id: -1 })
        .lean();

    return lastMessage ? normalizeMessage(lastMessage) : null;
}

async function findMessageById(messageId) {
    const message = await Message.findOne({ id: messageId }).lean();

    return message ? normalizeMessage(message) : null;
}

async function createMessage({ roomId, senderId, text }) {
    // Автор автоматично додається в readBy, бо він "прочитав" власне повідомлення при створенні.
    const message = await Message.create({
        id: randomUUID(),
        roomId,
        senderId,
        senderName: await getSenderName(senderId),
        text,
        status: "sent",
        readBy: [senderId],
        reactions: {},
        editedAt: null,
        deletedAt: null
    });

    return normalizeMessage(message);
}

async function markRoomMessagesAsRead(roomId, userId) {
    // Оновлюємо тільки чужі повідомлення, які цей користувач ще не читав.
    const messagesToUpdate = await Message.find({
        roomId,
        senderId: { $ne: userId },
        readBy: { $ne: userId }
    })
        .select("id")
        .lean();

    const messageIds = messagesToUpdate.map(message => message.id);

    if (messageIds.length === 0) {
        return [];
    }

    await Message.updateMany(
        { id: { $in: messageIds } },
        { $addToSet: { readBy: userId } }
    );

    const updatedMessages = await Message.find({ id: { $in: messageIds } })
        .sort({ createdAt: 1, _id: 1 })
        .lean();

    return Promise.all(updatedMessages.map(normalizeMessage));
}

async function markMessagesAsRead(roomId, userId) {
    return markRoomMessagesAsRead(roomId, userId);
}

// Редагувати й видаляти можна лише власне, ще не видалене повідомлення.
async function findMutableMessage(messageId, userId) {
    const message = await Message.findOne({ id: messageId }).lean();

    if (!message) {
        return {
            success: false,
            message: "Повідомлення не знайдено"
        };
    }

    if (message.senderId !== userId) {
        return {
            success: false,
            message: "Можна змінювати тільки власні повідомлення"
        };
    }

    if (message.deletedAt) {
        return {
            success: false,
            message: "Повідомлення вже видалено"
        };
    }

    return {
        success: true,
        message
    };
}

async function editMessage({ messageId, userId, text }) {
    const result = await findMutableMessage(messageId, userId);

    if (!result.success) {
        return result;
    }

    const cleanText = String(text || "").trim();

    if (!cleanText) {
        return {
            success: false,
            message: "Повідомлення не може бути порожнім"
        };
    }

    const message = await Message.findOneAndUpdate(
        {
            id: messageId,
            senderId: userId,
            deletedAt: null
        },
        {
            $set: {
                text: cleanText,
                editedAt: new Date()
            }
        },
        {
            new: true
        }
    ).lean();

    if (!message) {
        return {
            success: false,
            message: "Повідомлення не знайдено"
        };
    }

    return {
        success: true,
        message: await normalizeMessage(message)
    };
}

async function deleteMessage({ messageId, userId }) {
    const result = await findMutableMessage(messageId, userId);

    if (!result.success) {
        return result;
    }

    const message = await Message.findOneAndUpdate(
        {
            id: messageId,
            senderId: userId,
            deletedAt: null
        },
        {
            $set: {
                text: "",
                reactions: {},
                deletedAt: new Date()
            }
        },
        {
            new: true
        }
    ).lean();

    if (!message) {
        return {
            success: false,
            message: "Повідомлення не знайдено"
        };
    }

    return {
        success: true,
        message: await normalizeMessage(message)
    };
}

async function toggleMessageReaction({ messageId, userId, emoji }) {
    const message = await Message.findOne({ id: messageId }).lean();

    if (!message || message.deletedAt) {
        return {
            success: false,
            message: "Повідомлення не знайдено"
        };
    }

    const cleanEmoji = String(emoji || "").trim();
    const allowedReactions = ["👍", "❤️", "😂", "😮", "✅"];

    if (!allowedReactions.includes(cleanEmoji)) {
        return {
            success: false,
            message: "Недоступна реакція"
        };
    }

    const reactions = getReactionObject(message.reactions);
    const hadSameReaction = Array.isArray(reactions[cleanEmoji]) &&
        reactions[cleanEmoji].includes(userId);

    // Один користувач може мати лише одну активну реакцію на повідомлення.
    Object.keys(reactions).forEach(itemEmoji => {
        reactions[itemEmoji] = reactions[itemEmoji].filter(id => id !== userId);

        if (reactions[itemEmoji].length === 0) {
            delete reactions[itemEmoji];
        }
    });

    if (!hadSameReaction) {
        reactions[cleanEmoji] = [...(reactions[cleanEmoji] || []), userId];
    }

    const updatedMessage = await Message.findOneAndUpdate(
        {
            id: messageId,
            deletedAt: null
        },
        {
            $set: {
                reactions
            }
        },
        {
            new: true
        }
    ).lean();

    if (!updatedMessage) {
        return {
            success: false,
            message: "Повідомлення не знайдено"
        };
    }

    return {
        success: true,
        message: await normalizeMessage(updatedMessage)
    };
}

module.exports = {
    getRoomMessages,
    getLastRoomMessage,
    findMessageById,
    createMessage,
    markRoomMessagesAsRead,
    markMessagesAsRead,
    editMessage,
    deleteMessage,
    toggleMessageReaction
};
