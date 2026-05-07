const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const { ensureInitialStudents, getSafeStudent } = require("./student.service");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Повне ім'я використовується як один із варіантів логіна для студента.
function getFullName(user) {
    return `${user.firstName} ${user.lastName || ""}`.trim();
}

async function login(username, password) {
    // Перед логіном гарантуємо, що стартові користувачі вже є в базі.
    await ensureInitialStudents();

    const normalizedUsername = String(username || "").trim().toLowerCase();
    const users = await Student.find().lean();
    const user = users.find(student => {
        const fullName = getFullName(student).toLowerCase();

        // Увійти можна або за повним ім'ям, або за внутрішнім id студента.
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

    // У токен кладемо лише дані, потрібні клієнту для перевірки ролі та відображення профілю.
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
        user: getSafeStudent(user)
    };
}

module.exports = {
    login
};
