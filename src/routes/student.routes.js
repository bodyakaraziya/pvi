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

router.get("/", async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;

    const result = await getPaginatedStudents(page, limit);

    return res.json({
        success: true,
        isLoggedIn: checkIsLoggedIn(req),
        ...result
    });
});

router.get("/:id", async (req, res) => {
    const student = await findStudentById(req.params.id);

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

router.post("/", requireApiAuth, async (req, res) => {
    const result = await createStudent(req.body);

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.status(201).json(result);
});

router.put("/:id", requireApiAuth, async (req, res) => {
    const result = await updateStudent(req.params.id, req.body);

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.json(result);
});

router.delete("/:id", requireApiAuth, async (req, res) => {
    const success = await deleteStudent(req.params.id);

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

router.post("/bulk-delete", requireApiAuth, async (req, res) => {
    const success = await deleteStudents(req.body.ids);

    return res.json({
        success
    });
});

module.exports = router;
