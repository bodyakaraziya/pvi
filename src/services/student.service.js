const { randomUUID } = require("crypto");
const memoryStore = require("../data/memoryStore");

const { createDirectRoom } = require("./room.service");

function getSafeStudent(student) {
    const { password, ...safeStudent } = student;
    return safeStudent;
}

function getFullName(student) {
    return `${student.firstName} ${student.lastName}`.trim();
}

function getPaginatedStudents(page = 1, limit = 5) {
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.max(Number(limit) || 5, 1);

    const start = (normalizedPage - 1) * normalizedLimit;
    const end = start + normalizedLimit;

    const students = memoryStore.students
        .filter(student => student.role !== "admin")
        .slice(start, end)
        .map(getSafeStudent);

    const totalStudents = memoryStore.students.filter(student => student.role !== "admin").length;
    const totalPages = Math.max(Math.ceil(totalStudents / normalizedLimit), 1);

    return {
        students,
        totalPages,
        currentPage: normalizedPage
    };
}

function findStudentById(id) {
    return memoryStore.students.find(student => student.id === id);
}

function validateStudent(data, excludeId = null) {
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

    const duplicate = memoryStore.students.some(student => {
        if (student.id === excludeId) {
            return false;
        }

        return (
            String(student.firstName || "").toLowerCase() === String(data.firstName || "").toLowerCase() &&
            String(student.lastName || "").toLowerCase() === String(data.lastName || "").toLowerCase() &&
            student.group === data.group
        );
    });

    if (duplicate) {
        errors.duplicate = "Такий студент вже існує в цій групі.";
    }

    return errors;
}

function getNextStudentId() {
    const studentNumbers = memoryStore.students
        .filter(student => student.id.startsWith("s"))
        .map(student => Number(student.id.slice(1)))
        .filter(Number.isFinite);

    const maxId = studentNumbers.length > 0 ? Math.max(...studentNumbers) : 0;

    return `s${maxId + 1}`;
}

function createStudent(data) {
    const errors = validateStudent(data);

    if (Object.keys(errors).length > 0) {
        return {
            success: false,
            errors
        };
    }

    const student = {
        id: getNextStudentId(),
        group: String(data.group || "").trim(),
        firstName: String(data.firstName || "").trim(),
        lastName: String(data.lastName || "").trim(),
        gender: data.gender,
        birthday: data.birthday,
        password: data.birthday,
        role: "student",
        status: "offline"
    };

    memoryStore.students.push(student);
    createDirectRoom("admin", student.id);

    return {
        success: true,
        newId: student.id,
        student: getSafeStudent(student)
    };
}

function updateStudent(id, data) {
    const student = findStudentById(id);

    if (!student) {
        return {
            success: false,
            message: "Студента не знайдено."
        };
    }

    const errors = validateStudent(data, id);

    if (Object.keys(errors).length > 0) {
        return {
            success: false,
            errors
        };
    }

    student.group = data.group.trim();
    student.firstName = data.firstName.trim();
    student.lastName = data.lastName.trim();
    student.gender = data.gender;
    student.birthday = data.birthday;
    student.password = data.birthday;

    return {
        success: true,
        student: getSafeStudent(student)
    };
}

function deleteStudent(id) {
    const index = memoryStore.students.findIndex(student => student.id === id);

    if (index === -1) {
        return false;
    }

    memoryStore.students.splice(index, 1);

    memoryStore.rooms.forEach(room => {
        room.participants = room.participants.filter(participantId => participantId !== id);
    });

    return true;
}

function deleteStudents(ids) {
    if (!Array.isArray(ids)) {
        return false;
    }

    ids.forEach(deleteStudent);

    return true;
}

module.exports = {
    getPaginatedStudents,
    findStudentById,
    getSafeStudent,
    getFullName,
    createStudent,
    updateStudent,
    deleteStudent,
    deleteStudents
};
