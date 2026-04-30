const jwt = require("jsonwebtoken");
const memoryStore = require("../data/memoryStore");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function getFullName(user) {
    return `${user.firstName} ${user.lastName || ""}`.trim();
}

function login(username, password) {
    const normalizedUsername = String(username || "").trim().toLowerCase();

    const user = memoryStore.students.find(student => {
        const fullName = getFullName(student).toLowerCase();

        return (
            fullName === normalizedUsername ||
            student.id.toLowerCase() === normalizedUsername
        );
    });

    if (!user || user.password !== password) {
        return {
            success: false,
            message: "Невірний логін або пароль"
        };
    }

    const tokenPayload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "2h"
    });

    return {
        success: true,
        token,
        user: {
            id: user.id,
            group: user.group,
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            birthday: user.birthday,
            role: user.role,
            status: user.status
        }
    };
}

module.exports = {
    login
};