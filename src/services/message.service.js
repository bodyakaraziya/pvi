const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");

function getSenderName(senderId) {
    const sender = memoryStore.students.find(student => student.id === senderId);

    return sender
        ? `${sender.firstName} ${sender.lastName || ""}`.trim()
        : "Unknown";
}

function findMessageRoom(roomId) {
    return memoryStore.rooms.find(room => room.id === roomId);
}

function calculateMessageStatus(message) {
    const room = findMessageRoom(message.roomId);

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

function normalizeMessage(message) {
    const readBy = Array.isArray(message.readBy) ? [...message.readBy] : [];
    const senderName = message.senderName || getSenderName(message.senderId);

    message.readBy = readBy;
    message.senderName = senderName;
    message.status = calculateMessageStatus(message);

    return {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderName,
        text: message.text,
        status: message.status,
        readBy: [...readBy],
        createdAt: message.createdAt
    };
}

function getRoomMessages(roomId) {
    return memoryStore.messages
        .filter(message => message.roomId === roomId)
        .map(normalizeMessage);
}

function getLastRoomMessage(roomId) {
    const lastMessage = memoryStore.messages
        .filter(message => message.roomId === roomId)
        .reduce((latest, message) => {
            if (!latest) {
                return message;
            }

            return new Date(message.createdAt) > new Date(latest.createdAt)
                ? message
                : latest;
        }, null);

    return lastMessage ? normalizeMessage(lastMessage) : null;
}

function createMessage({ roomId, senderId, text }) {
    const message = {
        id: randomUUID(),
        roomId,
        senderId,
        senderName: getSenderName(senderId),
        text,
        status: "sent",
        readBy: [senderId],
        createdAt: new Date().toISOString()
    };

    memoryStore.messages.push(message);

    return normalizeMessage(message);
}

function markRoomMessagesAsRead(roomId, userId) {
    const updatedMessages = [];

    memoryStore.messages.forEach(message => {
        if (message.roomId !== roomId) {
            return;
        }

        if (message.senderId === userId) {
            return;
        }

        if (!message.readBy.includes(userId)) {
            message.readBy.push(userId);
            updatedMessages.push(normalizeMessage(message));
        }
    });

    return updatedMessages;
}

function markMessagesAsRead(roomId, userId) {
    return markRoomMessagesAsRead(roomId, userId);
}

module.exports = {
    getRoomMessages,
    getLastRoomMessage,
    createMessage,
    markRoomMessagesAsRead,
    markMessagesAsRead
};
