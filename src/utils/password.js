const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

function normalizePassword(password) {
    return String(password ?? "");
}

function hashPassword(password) {
    return bcrypt.hash(normalizePassword(password), SALT_ROUNDS);
}

function comparePassword(password, passwordHash) {
    if (!passwordHash) {
        return false;
    }

    return bcrypt.compare(normalizePassword(password), passwordHash);
}

module.exports = {
    SALT_ROUNDS,
    hashPassword,
    comparePassword
};
