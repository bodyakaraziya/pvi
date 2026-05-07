const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");
const Notification = require("../models/Notification");
const Student = require("../models/Student");
const { findRoomById, formatRoomForUser } = require("./room.service");

// Дати віддаємо у форматі ISO, щоб браузер стабільно сортував і показував їх.
function normalizeDate(date) {
    if (!date) {
        return null;
    }

    return date instanceof Date ? date.toISOString() : date;
}

function toPlainNotification(notification) {
    if (!notification) {
        return null;
    }

    if (typeof notification.toObject === "function") {
        return notification.toObject();
    }

    return notification;
}

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

async function getNotificationRoomMeta(notification) {
    // Якщо кімната ще існує, беремо актуальну назву для конкретного отримувача.
    const room = await findRoomById(notification.roomId);
    const formattedRoom = room ? await formatRoomForUser(room, notification.recipientId) : null;

    return {
        roomName: formattedRoom
            ? formattedRoom.name
            : notification.roomName || "Chat",
        roomType: formattedRoom?.type || notification.roomType || "direct"
    };
}

async function normalizeNotification(notification) {
    // Нормалізація зберігає fallback-дані, щоб старі сповіщення не ламали UI після змін кімнати.
    const plainNotification = toPlainNotification(notification);
    const senderName = plainNotification.senderName || await getSenderName(plainNotification.senderId);
    const { roomName, roomType } = await getNotificationRoomMeta(plainNotification);

    return {
        id: plainNotification.id,
        recipientId: plainNotification.recipientId,
        roomId: plainNotification.roomId,
        roomName,
        roomType,
        senderId: plainNotification.senderId,
        senderName,
        text: plainNotification.text,
        isRead: Boolean(plainNotification.isRead),
        createdAt: normalizeDate(plainNotification.updatedAt || plainNotification.createdAt)
    };
}

async function getUserNotifications(userId) {
    // Дзвіночок працює тільки з непрочитаними сповіщеннями.
    const notifications = await Notification.find({
        recipientId: userId,
        isRead: false
    })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .lean();

    return Promise.all(notifications.map(normalizeNotification));
}

async function createNotification({ recipientId, roomId, senderId, text }) {
    const senderName = await getSenderName(senderId);
    const room = await findRoomById(roomId);
    const formattedRoom = room ? await formatRoomForUser(room, recipientId) : null;
    const roomName = formattedRoom?.name || "Chat";
    const roomType = formattedRoom?.type || "direct";

    // Для одного відправника в одній кімнаті оновлюємо існуюче непрочитане сповіщення.
    const existingNotification = await Notification.findOneAndUpdate(
        {
            recipientId,
            roomId,
            senderId,
            isRead: false
        },
        {
            $set: {
                roomName,
                roomType,
                senderName,
                text,
                isRead: false
            }
        },
        {
            new: true
        }
    ).lean();

    if (existingNotification) {
        return normalizeNotification(existingNotification);
    }

    const notification = await Notification.create({
        id: randomUUID(),
        recipientId,
        roomId,
        roomName,
        roomType,
        senderId,
        senderName,
        text,
        isRead: false
    });

    return normalizeNotification(notification);
}

async function markNotificationAsRead(notificationId, userId) {
    const result = await Notification.updateOne(
        {
            id: notificationId,
            recipientId: userId
        },
        {
            $set: {
                isRead: true
            }
        }
    );

    return result.matchedCount > 0;
}

async function markRoomNotificationsAsRead(roomId, userId) {
    // Відкриття кімнати прибирає всі її сповіщення з дзвіночка.
    return deleteRoomNotifications(roomId, userId);
}

async function deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({
        id: notificationId,
        recipientId: userId
    });

    return result.deletedCount > 0;
}

async function deleteRoomNotifications(roomId, userId) {
    const result = await Notification.deleteMany({
        roomId,
        recipientId: userId
    });

    return result.deletedCount > 0;
}

module.exports = {
    getUserNotifications,
    createNotification,
    markNotificationAsRead,
    markRoomNotificationsAsRead,
    deleteNotification,
    deleteRoomNotifications
};
