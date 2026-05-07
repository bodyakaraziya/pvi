const express = require("express");
const { login } = require("../services/auth.service");
const { requireApiAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Логін приймає ім'я/ID студента й пароль, а після успіху кладе JWT у cookie.
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Введіть логін і пароль"
        });
    }

    const result = await login(username, password);

    if (!result.success) {
        return res.status(401).json(result);
    }

    res.cookie("token", result.token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000
    });

    return res.json({
        success: true,
        user: result.user
    });
});

// Logout достатньо очистити cookie з токеном: стан сесії на сервері не зберігається.
router.post("/logout", (req, res) => {
    res.clearCookie("token");

    return res.json({
        success: true
    });
});

// Поточний користувач береться з перевіреного JWT, який middleware записав у req.user.
router.get("/me", requireApiAuth, (req, res) => {
    return res.json({
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
    });
});

module.exports = router;
