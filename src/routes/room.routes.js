const express = require("express");
const { requireApiAuth } = require("../middleware/auth.middleware");
const {
    getUserRooms,
    createRoom,
    findRoomById,
    addRoomParticipants
} = require("../services/room.service");
const { getRoomMessages } = require("../services/message.service");

const router = express.Router();

// Повертаємо тільки ті кімнати, де поточний користувач є учасником.
router.get("/", requireApiAuth, async (req, res) => {
    const rooms = await getUserRooms(req.user.id);

    res.json({
        success: true,
        rooms
    });
});

// Створення кімнати йде через service-шар, який сам вирішує direct це чат чи group.
router.post("/", requireApiAuth, async (req, res) => {
    const { name, participantIds } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Оберіть учасників чату"
        });
    }

    const result = await createRoom({
        name,
        participantIds,
        createdBy: req.user.id
    });

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.status(result.existed ? 200 : 201).json(result);
});

// Перед віддачею історії перевіряємо, що користувач справді належить до кімнати.
router.get("/:roomId/messages", requireApiAuth, async (req, res) => {
    const room = await findRoomById(req.params.roomId);

    if (!room || !room.participants.includes(req.user.id)) {
        return res.status(403).json({
            success: false,
            message: "Немає доступу до цього чату"
        });
    }

    res.json({
        success: true,
        messages: await getRoomMessages(req.params.roomId)
    });
});

// Додавання учасників також змінює direct-чат на group, якщо людей стає більше двох.
router.patch("/:roomId/participants", requireApiAuth, async (req, res) => {
    const { participantIds } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Оберіть учасників чату"
        });
    }

    const result = await addRoomParticipants({
        roomId: req.params.roomId,
        participantIds,
        requestedBy: req.user.id
    });

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.json(result);
});

module.exports = router;
