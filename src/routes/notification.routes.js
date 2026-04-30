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

router.get("/", requireApiAuth, (req, res) => {
    const notifications = getUserNotifications(req.user.id);

    res.json({
        success: true,
        notifications
    });
});

router.patch("/:id/read", requireApiAuth, (req, res) => {
    const success = markNotificationAsRead(req.params.id, req.user.id);

    res.json({
        success
    });
});

router.patch("/room/:roomId/read", requireApiAuth, (req, res) => {
    markRoomNotificationsAsRead(req.params.roomId, req.user.id);

    res.json({
        success: true
    });
});

router.delete("/room/:roomId", requireApiAuth, (req, res) => {
    deleteRoomNotifications(req.params.roomId, req.user.id);

    res.json({
        success: true
    });
});

router.delete("/:id", requireApiAuth, (req, res) => {
    const success = deleteNotification(req.params.id, req.user.id);

    res.json({
        success
    });
});

module.exports = router;
