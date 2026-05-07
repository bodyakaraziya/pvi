const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");
const Room = require("../models/Room");
const Student = require("../models/Student");
const { getLastRoomMessage } = require("./message.service");

// Кімнати сіються один раз на процес, щоб паралельні запити не створили дублікати.
let initialRoomsPromise = null;

function normalizeDate(date) {
    if (!date) {
        return null;
    }

    return date instanceof Date ? date.toISOString() : date;
}

function toPlainRoom(room) {
    if (!room) {
        return null;
    }

    if (typeof room.toObject === "function") {
        return room.toObject();
    }

    return room;
}

async function ensureInitialRooms() {
    // initialRoomsPromise запам'ятовує перший запуск seed-логіки й повторно чекає той самий Promise.
    if (!initialRoomsPromise) {
        initialRoomsPromise = (async () => {
            await ensureInitialStudents();

            const students = await Student.find()
                .select("id")
                .lean();
            const studentIds = students.map(student => student.id);
            const roomsToSeed = memoryStore.rooms.filter(room => {
                return room.participants.every(participantId => studentIds.includes(participantId));
            });

            return Promise.all(roomsToSeed.map(room => {
                return Room.updateOne(
                    { id: room.id },
                    {
                        $setOnInsert: {
                            id: room.id,
                            name: room.name,
                            type: room.type,
                            participants: room.participants,
                            createdBy: room.createdBy,
                            createdAt: room.createdAt
                        }
                    },
                    { upsert: true }
                );
            }));
        })();
    }

    await initialRoomsPromise;
}

async function ensureInitialStudents() {
    await Student.seedInitial(memoryStore.students);
}

// У відповіді по учаснику не віддаємо пароль та інші службові поля.
async function getSafeParticipant(participantId) {
    await ensureInitialStudents();

    const student = await Student.findOne({ id: participantId }).lean();

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

async function formatRoomForUser(room, userId) {
    // Назва direct-чату залежить від того, хто саме відкриває кімнату.
    const plainRoom = toPlainRoom(room);
    const participants = (await Promise.all(
        plainRoom.participants.map(getSafeParticipant)
    )).filter(Boolean);
    const lastMessage = await getLastRoomMessage(plainRoom.id);

    return {
        id: plainRoom.id,
        name: getRoomDisplayName(plainRoom, userId, participants),
        type: plainRoom.type,
        participants,
        createdBy: plainRoom.createdBy,
        createdAt: normalizeDate(plainRoom.createdAt),
        lastMessage
    };
}

function getRoomDisplayName(room, userId, formattedParticipants = null) {
    const plainRoom = toPlainRoom(room);
    const participants = formattedParticipants || [];
    const otherParticipants = participants.filter(user => user.id !== userId);

    let displayName = plainRoom.name;

    if (plainRoom.type === "direct" && otherParticipants.length > 0) {
        displayName = `${otherParticipants[0].firstName} ${otherParticipants[0].lastName || ""}`.trim();
    }

    return displayName || (plainRoom.type === "group" ? "Group chat" : "Direct chat");
}

async function findDirectRoom(participantIds) {
    // Direct-чат між однаковими двома людьми має існувати в одному екземплярі.
    await ensureInitialRooms();

    return Room.findOne({
        type: "direct",
        participants: {
            $all: participantIds,
            $size: participantIds.length
        }
    }).lean();
}

async function getUserRooms(userId) {
    await ensureInitialRooms();

    const rooms = await Room.find({ participants: userId }).lean();
    const formattedRooms = await Promise.all(
        rooms.map(room => formatRoomForUser(room, userId))
    );

    // Найактивніші чати показуємо першими: за останнім повідомленням або датою створення.
    return formattedRooms.sort((a, b) => {
        const aDate = a.lastMessage?.createdAt || a.createdAt;
        const bDate = b.lastMessage?.createdAt || b.createdAt;

        return new Date(bDate) - new Date(aDate);
    });
}

async function findRoomById(roomId) {
    await ensureInitialRooms();

    return Room.findOne({ id: roomId }).lean();
}

async function createRoom({ name, participantIds = [], createdBy }) {
    await ensureInitialRooms();
    await ensureInitialStudents();

    // Автор завжди входить до кімнати, дублікати учасників відкидаємо.
    const uniqueParticipants = [...new Set([createdBy, ...participantIds].filter(Boolean))];

    if (uniqueParticipants.length < 2) {
        return {
            success: false,
            message: "Оберіть учасників чату"
        };
    }

    const foundParticipants = await Student.find({
        id: { $in: uniqueParticipants }
    })
        .select("id")
        .lean();
    const foundParticipantIds = foundParticipants.map(student => student.id);
    const missingParticipant = uniqueParticipants.find(id => {
        return !foundParticipantIds.includes(id);
    });

    if (missingParticipant) {
        return {
            success: false,
            message: "Учасника чату не знайдено"
        };
    }

    const roomType = uniqueParticipants.length === 2 ? "direct" : "group";

    if (roomType === "direct") {
        // Якщо direct-кімната вже є, повертаємо її замість створення другої.
        const existingRoom = await findDirectRoom(uniqueParticipants);

        if (existingRoom) {
            return {
                success: true,
                existed: true,
                room: await formatRoomForUser(existingRoom, createdBy)
            };
        }
    }

    const room = await Room.create({
        id: `room-${randomUUID()}`,
        name: name?.trim() || (roomType === "direct" ? "Direct chat" : "Group chat"),
        type: roomType,
        participants: uniqueParticipants,
        createdBy
    });

    return {
        success: true,
        existed: false,
        room: await formatRoomForUser(room, createdBy)
    };
}

async function createDirectRoom(createdBy, participantId) {
    return createRoom({
        createdBy,
        participantIds: [participantId]
    });
}

async function addRoomParticipants({ roomId, participantIds = [], requestedBy }) {
    await ensureInitialRooms();
    await ensureInitialStudents();

    const room = await findRoomById(roomId);

    if (!room || !room.participants.includes(requestedBy)) {
        return {
            success: false,
            message: "Немає доступу до цього чату"
        };
    }

    const uniqueParticipantIds = [...new Set(participantIds.filter(Boolean))];
    const foundParticipants = await Student.find({
        id: { $in: uniqueParticipantIds }
    })
        .select("id")
        .lean();
    const foundParticipantIds = foundParticipants.map(student => student.id);
    const missingParticipant = uniqueParticipantIds.find(id => {
        return !foundParticipantIds.includes(id);
    });

    if (missingParticipant) {
        return {
            success: false,
            message: "Учасника чату не знайдено"
        };
    }

    const addedParticipantIds = uniqueParticipantIds.filter(id => {
        return !room.participants.includes(id);
    });

    const nextParticipants = [...room.participants, ...addedParticipantIds];
    const updates = {
        participants: nextParticipants
    };

    // Direct-чат автоматично стає груповим, коли до нього додають третього учасника.
    if (nextParticipants.length > 2) {
        updates.type = "group";

        if (!room.name || room.name === "Direct chat") {
            updates.name = "Group chat";
        }
    }

    const updatedRoom = await Room.findOneAndUpdate(
        { id: roomId },
        { $set: updates },
        { new: true }
    ).lean();

    return {
        success: true,
        addedParticipantIds,
        room: await formatRoomForUser(updatedRoom, requestedBy)
    };
}

module.exports = {
    getUserRooms,
    findRoomById,
    formatRoomForUser,
    getRoomDisplayName,
    createRoom,
    createDirectRoom,
    addRoomParticipants
};
