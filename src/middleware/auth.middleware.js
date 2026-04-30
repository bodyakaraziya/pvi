const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function getTokenFromRequest(req) {
    return req.cookies?.token || null;
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

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