const express = require("express");
const {
    getPaginatedStudents,
    findStudentById,
    getSafeStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    deleteStudents
} = require("../services/student.service");

const { requireApiAuth, verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();

function checkIsLoggedIn(req) {
    const token = req.cookies?.token;

    if (!token) {
        return false;
    }

    try {
        verifyToken(token);
        return true;
    } catch {
        return false;
    }
}

router.get("/", (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;

    const result = getPaginatedStudents(page, limit);

    return res.json({
        success: true,
        isLoggedIn: checkIsLoggedIn(req),
        ...result
    });
});

router.get("/:id", (req, res) => {
    const student = findStudentById(req.params.id);

    if (!student) {
        return res.status(404).json({
            success: false,
            message: "Студента не знайдено."
        });
    }

    return res.json({
        success: true,
        student: getSafeStudent(student)
    });
});

router.post("/", requireApiAuth, (req, res) => {
    const result = createStudent(req.body);

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.status(201).json(result);
});

router.put("/:id", requireApiAuth, (req, res) => {
    const result = updateStudent(req.params.id, req.body);

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.json(result);
});

router.delete("/:id", requireApiAuth, (req, res) => {
    const success = deleteStudent(req.params.id);

    if (!success) {
        return res.status(404).json({
            success: false,
            message: "Студента не знайдено."
        });
    }

    return res.json({
        success: true
    });
});

router.post("/bulk-delete", requireApiAuth, (req, res) => {
    const success = deleteStudents(req.body.ids);

    return res.json({
        success
    });
});

module.exports = router;