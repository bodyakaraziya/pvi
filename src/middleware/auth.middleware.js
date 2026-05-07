const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Токен зберігається в httpOnly cookie, тому клієнтський JS не читає його напряму.
function getTokenFromRequest(req) {
    return req.cookies?.token || null;
}

// Окрема функція потрібна і для Express middleware, і для Socket.IO авторизації.
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

// Захист HTML-сторінок: якщо користувач не увійшов, відправляємо його на публічну сторінку.
function requirePageAuth(req, res, next) {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.redirect("/students?auth_required=1");
    }

    try {
        req.user = verifyToken(token);
        return next();
    } catch {
        return res.redirect("/students?auth_required=1");
    }
}

// Захист API: замість редіректу повертаємо JSON з помилкою, щоб fetch міг її обробити.
function requireApiAuth(req, res, next) {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Не авторизовано"
        });
    }

    try {
        req.user = verifyToken(token);
        return next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Недійсний токен"
        });
    }
}

module.exports = {
    requirePageAuth,
    requireApiAuth,
    verifyToken
};
