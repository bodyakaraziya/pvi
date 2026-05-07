const memoryStore = require("../data/memoryStore");
const Student = require("../models/Student");
const Room = require("../models/Room");

const { createDirectRoom } = require("./room.service");

async function ensureInitialStudents() {
    await Student.seedInitial(memoryStore.students);
}

function toPlainStudent(student) {
    if (!student) {
        return null;
    }

    if (typeof student.toObject === "function") {
        return student.toObject();
    }

    return student;
}

function getSafeStudent(student) {
    const plainStudent = toPlainStudent(student);

    if (!plainStudent) {
        return null;
    }

    return {
        id: plainStudent.id,
        group: plainStudent.group,
        firstName: plainStudent.firstName,
        lastName: plainStudent.lastName,
        gender: plainStudent.gender,
        birthday: plainStudent.birthday,
        role: plainStudent.role,
        status: plainStudent.status
    };
}

function getFullName(student) {
    return `${student.firstName} ${student.lastName || ""}`.trim();
}

async function getPaginatedStudents(page = 1, limit = 5) {
    await ensureInitialStudents();

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.max(Number(limit) || 5, 1);
    const skip = (normalizedPage - 1) * normalizedLimit;
    const filter = {
        role: { $ne: "admin" }
    };

    const [students, totalStudents] = await Promise.all([
        Student.find(filter)
            .sort({ createdAt: 1, _id: 1 })
            .skip(skip)
            .limit(normalizedLimit)
            .lean(),
        Student.countDocuments(filter)
    ]);
    const totalPages = Math.max(Math.ceil(totalStudents / normalizedLimit), 1);

    return {
        students: students.map(getSafeStudent),
        totalPages,
        currentPage: normalizedPage
    };
}

async function findStudentById(id) {
    await ensureInitialStudents();

    return Student.findOne({ id }).lean();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function validateStudent(data, excludeId = null) {
    await ensureInitialStudents();

    const errors = {};
    const nameReg = /^[A-Za-zА-Яа-яЇїЄєІіҐґ]([A-Za-zА-Яа-яЇїЄєІіҐґ'’\-]*[A-Za-zА-Яа-яЇїЄєІіҐґ])?$/u;

    if (!data.group) {
        errors.group = "Оберіть групу.";
    }

    if (!nameReg.test(data.firstName || "")) {
        errors.firstName = "Введіть коректне ім'я.";
    }

    if (!nameReg.test(data.lastName || "")) {
        errors.lastName = "Введіть коректне прізвище.";
    }

    if (!data.gender || !["M", "F"].includes(data.gender)) {
        errors.gender = "Оберіть стать.";
    }

    const date = new Date(data.birthday);
    const year = date.getFullYear();

    if (!data.birthday || Number.isNaN(date.getTime()) || year < 1950 || year > 2010) {
        errors.birthday = "Рік має бути 1950-2010.";
    }

    const duplicateQuery = {
        firstName: new RegExp(`^${escapeRegExp(String(data.firstName || "").trim())}$`, "i"),
        lastName: new RegExp(`^${escapeRegExp(String(data.lastName || "").trim())}$`, "i"),
        group: String(data.group || "").trim()
    };

    if (excludeId) {
        duplicateQuery.id = { $ne: excludeId };
    }

    const duplicate = await Student.findOne(duplicateQuery).lean();

    if (duplicate) {
        errors.duplicate = "Такий студент вже існує в цій групі.";
    }

    return errors;
}

async function getNextStudentId() {
    await ensureInitialStudents();

    const students = await Student.find({
        id: /^s\d+$/
    })
        .select("id")
        .lean();
    const studentNumbers = students
        .map(student => Number(student.id.slice(1)))
        .filter(Number.isFinite);
    const maxId = studentNumbers.length > 0 ? Math.max(...studentNumbers) : 0;

    return `s${maxId + 1}`;
}

async function createStudent(data) {
    await ensureInitialStudents();

    const errors = await validateStudent(data);

    if (Object.keys(errors).length > 0) {
        return {
            success: false,
            errors
        };
    }

    const student = await Student.create({
        id: await getNextStudentId(),
        group: String(data.group || "").trim(),
        firstName: String(data.firstName || "").trim(),
        lastName: String(data.lastName || "").trim(),
        gender: data.gender,
        birthday: data.birthday,
        password: data.birthday,
        role: "student",
        status: "offline"
    });

    await createDirectRoom("admin", student.id);

    return {
        success: true,
        newId: student.id,
        student: getSafeStudent(student)
    };
}

async function updateStudent(id, data) {
    await ensureInitialStudents();

    const student = await findStudentById(id);

    if (!student) {
        return {
            success: false,
            message: "Студента не знайдено."
        };
    }

    const errors = await validateStudent(data, id);

    if (Object.keys(errors).length > 0) {
        return {
            success: false,
            errors
        };
    }

    const updatedStudent = await Student.findOneAndUpdate(
        { id },
        {
            $set: {
                group: data.group.trim(),
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                gender: data.gender,
                birthday: data.birthday,
                password: data.birthday
            }
        },
        { new: true }
    ).lean();

    return {
        success: true,
        student: getSafeStudent(updatedStudent)
    };
}

async function cleanRoomsAfterStudentDelete(ids) {
    await Room.deleteMany({
        type: "direct",
        participants: { $in: ids }
    });

    await Room.updateMany(
        {
            type: "group",
            participants: { $in: ids }
        },
        {
            $pull: {
                participants: { $in: ids }
            }
        }
    );

    await Room.deleteMany({
        type: "group",
        $expr: {
            $lt: [{ $size: "$participants" }, 2]
        }
    });
}

async function deleteStudent(id) {
    await ensureInitialStudents();

    const result = await Student.deleteOne({ id });

    if (result.deletedCount === 0) {
        return false;
    }

    await cleanRoomsAfterStudentDelete([id]);

    return true;
}

async function deleteStudents(ids) {
    if (!Array.isArray(ids)) {
        return false;
    }

    const result = await Student.deleteMany({
        id: { $in: ids }
    });

    if (result.deletedCount > 0) {
        await cleanRoomsAfterStudentDelete(ids);
    }

    return true;
}

module.exports = {
    ensureInitialStudents,
    getPaginatedStudents,
    findStudentById,
    getSafeStudent,
    getFullName,
    createStudent,
    updateStudent,
    deleteStudent,
    deleteStudents
};
