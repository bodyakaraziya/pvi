const express = require("express");
const { requireApiAuth } = require("../middleware/auth.middleware");
const {
    getUserNotifications,
    markNotificationAsRead,
    markRoomNotificationsAsRead,
    deleteNotification,
    deleteRoomNotifications
} = require("../services/notification.service");

const router = express.Router();

// Дзвіночок показує лише непрочитані сповіщення поточного користувача.
router.get("/", requireApiAuth, async (req, res) => {
    const notifications = await getUserNotifications(req.user.id);

    res.json({
        success: true,
        notifications
    });
});

// Окреме сповіщення можна позначити прочитаним або видалити через UI дзвіночка.
router.patch("/:id/read", requireApiAuth, async (req, res) => {
    const success = await markNotificationAsRead(req.params.id, req.user.id);

    res.json({
        success
    });
});

// Коли користувач відкрив чат, усі сповіщення цієї кімнати прибираються.
router.patch("/room/:roomId/read", requireApiAuth, async (req, res) => {
    await markRoomNotificationsAsRead(req.params.roomId, req.user.id);

    res.json({
        success: true
    });
});

router.delete("/room/:roomId", requireApiAuth, async (req, res) => {
    await deleteRoomNotifications(req.params.roomId, req.user.id);

    res.json({
        success: true
    });
});

router.delete("/:id", requireApiAuth, async (req, res) => {
    const success = await deleteNotification(req.params.id, req.user.id);

    res.json({
        success
    });
});

module.exports = router;
