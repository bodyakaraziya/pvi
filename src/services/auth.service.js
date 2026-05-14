const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const { ensureInitialStudents, getSafeStudent, createStudent } = require("./student.service");
const { comparePassword, hashPassword } = require("../utils/password");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function getFullName(user) {
    return `${user.firstName} ${user.lastName || ""}`.trim();
}

async function login(username, password) {
    await ensureInitialStudents();

    const normalizedUsername = String(username || "").trim().toLowerCase();
    const users = await Student.find()
        .select("+passwordHash")
        .lean();
    const user = users.find(student => {
        const fullName = getFullName(student).toLowerCase();

        return (
            fullName === normalizedUsername ||
            student.id.toLowerCase() === normalizedUsername
        );
    });

    const isPasswordValid = user
        ? await comparePassword(password, user.passwordHash)
        : false;

    if (!user || !isPasswordValid) {
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
        user: getSafeStudent(user)
    };
}

async function register(data) {
    await ensureInitialStudents();

    const password = String(data.password ?? "");

    if (!password.trim()) {
        return {
            success: false,
            errors: {
                password: "Password is required."
            }
        };
    }

    return createStudent({
        group: data.group,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        birthday: data.birthday,
        password
    });
}

async function changePassword(userId, data) {
    await ensureInitialStudents();

    const currentPassword = String(data.currentPassword ?? "");
    const newPassword = String(data.newPassword ?? "");
    const confirmPassword = String(data.confirmPassword ?? "");

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
        return {
            success: false,
            message: "Fill in all password fields."
        };
    }

    if (newPassword !== confirmPassword) {
        return {
            success: false,
            message: "New password and confirmation do not match."
        };
    }

    if (newPassword === currentPassword) {
        return {
            success: false,
            message: "New password must be different from the current password."
        };
    }

    const user = await Student.findOne({ id: userId })
        .select("+passwordHash")
        .lean();
    const isCurrentPasswordValid = user
        ? await comparePassword(currentPassword, user.passwordHash)
        : false;

    if (!user || !isCurrentPasswordValid) {
        return {
            success: false,
            message: "Current password is incorrect."
        };
    }

    await Student.updateOne(
        { id: userId },
        {
            $set: {
                passwordHash: await hashPassword(newPassword)
            },
            $unset: {
                password: ""
            }
        }
    );

    return {
        success: true,
        message: "Password changed successfully."
    };
}

module.exports = {
    login,
    register,
    changePassword
};
