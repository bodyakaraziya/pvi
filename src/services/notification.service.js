const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");
const { findRoomById, getRoomDisplayName } = require("./room.service");

function getSenderName(senderId) {
    const sender = memoryStore.students.find(student => student.id === senderId);

    return sender
        ? `${sender.firstName} ${sender.lastName || ""}`.trim()
        : "Unknown";
}

function getNotificationRoomMeta(notification) {
    const room = findRoomById(notification.roomId);

    return {
        roomName: room
            ? getRoomDisplayName(room, notification.recipientId)
            : notification.roomName || "Chat",
        roomType: room?.type || notification.roomType || "direct"
    };
}

function normalizeNotification(notification) {
    const senderName = notification.senderName || getSenderName(notification.senderId);
    const { roomName, roomType } = getNotificationRoomMeta(notification);

    notification.senderName = senderName;
    notification.roomName = roomName;
    notification.roomType = roomType;

    return {
        id: notification.id,
        recipientId: notification.recipientId,
        roomId: notification.roomId,
        roomName,
        roomType,
        senderId: notification.senderId,
        senderName,
        text: notification.text,
        isRead: Boolean(notification.isRead),
        createdAt: notification.createdAt
    };
}

function getUserNotifications(userId) {
    return memoryStore.notifications
        .filter(notification => {
            return notification.recipientId === userId && !notification.isRead;
        })
        .map(normalizeNotification)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createNotification({ recipientId, roomId, senderId, text }) {
    const senderName = getSenderName(senderId);
    const createdAt = new Date().toISOString();
    const room = findRoomById(roomId);
    const roomName = room ? getRoomDisplayName(room, recipientId) : "Chat";
    const roomType = room?.type || "direct";

    const existingNotification = memoryStore.notifications.find(notification => {
        return (
            notification.recipientId === recipientId &&
            notification.roomId === roomId &&
            notification.senderId === senderId &&
            !notification.isRead
        );
    });

    if (existingNotification) {
        existingNotification.roomName = roomName;
        existingNotification.roomType = roomType;
        existingNotification.senderName = senderName;
        existingNotification.text = text;
        existingNotification.isRead = false;
        existingNotification.createdAt = createdAt;

        return normalizeNotification(existingNotification);
    }

    const notification = {
        id: randomUUID(),
        recipientId,
        roomId,
        roomName,
        roomType,
        senderId,
        senderName,
        text,
        isRead: false,
        createdAt
    };

    memoryStore.notifications.push(notification);

    return normalizeNotification(notification);
}

function markNotificationAsRead(notificationId, userId) {
    const notification = memoryStore.notifications.find(item => {
        return item.id === notificationId && item.recipientId === userId;
    });

    if (!notification) {
        return false;
    }

    notification.isRead = true;
    return true;
}

function markRoomNotificationsAsRead(roomId, userId) {
    return deleteRoomNotifications(roomId, userId);
}

function deleteNotification(notificationId, userId) {
    const index = memoryStore.notifications.findIndex(item => {
        return item.id === notificationId && item.recipientId === userId;
    });

    if (index === -1) {
        return false;
    }

    memoryStore.notifications.splice(index, 1);
    return true;
}

function deleteRoomNotifications(roomId, userId) {
    const initialLength = memoryStore.notifications.length;

    memoryStore.notifications = memoryStore.notifications.filter(notification => {
        return !(notification.roomId === roomId && notification.recipientId === userId);
    });

    return memoryStore.notifications.length !== initialLength;
}

module.exports = {
    getUserNotifications,
    createNotification,
    markNotificationAsRead,
    markRoomNotificationsAsRead,
    deleteNotification,
    deleteRoomNotifications
};
