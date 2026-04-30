const express = require("express");
const { requireApiAuth } = require("../middleware/auth.middleware");
const { getUserRooms, createRoom, findRoomById } = require("../services/room.service");
const { getRoomMessages } = require("../services/message.service");

const router = express.Router();

router.get("/", requireApiAuth, (req, res) => {
    const rooms = getUserRooms(req.user.id);

    res.json({
        success: true,
        rooms
    });
});

router.post("/", requireApiAuth, (req, res) => {
    const { name, participantIds } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Оберіть учасників чату"
        });
    }

    const result = createRoom({
        name,
        participantIds,
        createdBy: req.user.id
    });

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.status(result.existed ? 200 : 201).json(result);
});

router.get("/:roomId/messages", requireApiAuth, (req, res) => {
    const room = findRoomById(req.params.roomId);

    if (!room || !room.participants.includes(req.user.id)) {
        return res.status(403).json({
            success: false,
            message: "Немає доступу до цього чату"
        });
    }

    res.json({
        success: true,
        messages: getRoomMessages(req.params.roomId)
    });
});

module.exports = router;
