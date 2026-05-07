const path = require("path");
const express = require("express");
const { requirePageAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const viewsPath = path.join(__dirname, "../../views");

// Головна сторінка одразу веде до таблиці студентів.
router.get("/", (req, res) => {
    res.redirect("/students");
});

// Список студентів доступний без логіну, але дії створення/редагування захищені API.
router.get("/students", (req, res) => {
    res.sendFile(path.join(viewsPath, "students.html"));
});

// Решта HTML-сторінок потребують авторизованого користувача.
router.get("/dashboard", requirePageAuth, (req, res) => {
    res.sendFile(path.join(viewsPath, "dashboard.html"));
});

router.get("/tasks", requirePageAuth, (req, res) => {
    res.sendFile(path.join(viewsPath, "tasks.html"));
});

router.get("/messages", requirePageAuth, (req, res) => {
    res.sendFile(path.join(viewsPath, "messages.html"));
});

module.exports = router;
