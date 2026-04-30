const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");
const { getLastRoomMessage } = require("./message.service");

function getSafeParticipant(participantId) {
    const student = memoryStore.students.find(item => item.id === participantId);

    if (!student) {
        return null;
    }

    return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        role: student.role,
        status: student.status
    };
}

function formatRoomForUser(room, userId) {
    const participants = room.participants
        .map(getSafeParticipant)
        .filter(Boolean);

    return {
        id: room.id,
        name: getRoomDisplayName(room, userId, participants),
        type: room.type,
        participants,
        createdBy: room.createdBy,
        createdAt: room.createdAt,
        lastMessage: getLastRoomMessage(room.id)
    };
}

function getRoomDisplayName(room, userId, formattedParticipants = null) {
    const participants = formattedParticipants || room.participants
        .map(getSafeParticipant)
        .filter(Boolean);
    const otherParticipants = participants.filter(user => user.id !== userId);

    let displayName = room.name;

    if (room.type === "direct" && otherParticipants.length > 0) {
        displayName = `${otherParticipants[0].firstName} ${otherParticipants[0].lastName || ""}`.trim();
    }

    return displayName || (room.type === "group" ? "Group chat" : "Direct chat");
}

function findDirectRoom(participantIds) {
    return memoryStore.rooms.find(room => {
        return (
            room.type === "direct" &&
            room.participants.length === participantIds.length &&
            participantIds.every(id => room.participants.includes(id))
        );
    });
}

function getUserRooms(userId) {
    return memoryStore.rooms
        .filter(room => room.participants.includes(userId))
        .map(room => formatRoomForUser(room, userId))
        .sort((a, b) => {
            const aDate = a.lastMessage?.createdAt || a.createdAt;
            const bDate = b.lastMessage?.createdAt || b.createdAt;

            return new Date(bDate) - new Date(aDate);
        });
}

function findRoomById(roomId) {
    return memoryStore.rooms.find(room => room.id === roomId);
}

function createRoom({ name, participantIds = [], createdBy }) {
    const uniqueParticipants = [...new Set([createdBy, ...participantIds].filter(Boolean))];

    if (uniqueParticipants.length < 2) {
        return {
            success: false,
            message: "Оберіть учасників чату"
        };
    }

    const missingParticipant = uniqueParticipants.find(id => {
        return !memoryStore.students.some(student => student.id === id);
    });

    if (missingParticipant) {
        return {
            success: false,
            message: "Учасника чату не знайдено"
        };
    }

    const roomType = uniqueParticipants.length === 2 ? "direct" : "group";

    if (roomType === "direct") {
        const existingRoom = findDirectRoom(uniqueParticipants);

        if (existingRoom) {
            return {
                success: true,
                existed: true,
                room: formatRoomForUser(existingRoom, createdBy)
            };
        }
    }

    const room = {
        id: `room-${randomUUID()}`,
        name: name?.trim() || (roomType === "direct" ? "Direct chat" : "Group chat"),
        type: roomType,
        participants: uniqueParticipants,
        createdBy,
        createdAt: new Date().toISOString()
    };

    memoryStore.rooms.push(room);

    return {
        success: true,
        existed: false,
        room: formatRoomForUser(room, createdBy)
    };
}

function createDirectRoom(createdBy, participantId) {
    return createRoom({
        createdBy,
        participantIds: [participantId]
    });
}

module.exports = {
    getUserRooms,
    findRoomById,
    formatRoomForUser,
    getRoomDisplayName,
    createRoom,
    createDirectRoom
};
