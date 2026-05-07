const path = require("path");
const express = require("express");
const { requirePageAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const viewsPath = path.join(__dirname, "../../views");

router.get("/", (req, res) => {
    res.redirect("/students");
});

router.get("/students", (req, res) => {
    res.sendFile(path.join(viewsPath, "students.html"));
});

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