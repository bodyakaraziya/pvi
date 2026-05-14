const mongoose = require("mongoose");
const { hashPassword } = require("../utils/password");

const studentSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        group: {
            type: String,
            required: true,
            trim: true
        },
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            default: "",
            trim: true
        },
        gender: {
            type: String,
            enum: ["M", "F"],
            required: true
        },
        birthday: {
            type: String,
            default: null
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
        },
        password: {
            type: String,
            select: false
        },
        role: {
            type: String,
            enum: ["admin", "student"],
            default: "student"
        },
        status: {
            type: String,
            enum: ["online", "offline"],
            default: "offline"
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

async function prepareSeedStudent(student) {
    const plainPassword = student.seedPassword || student.password || student.birthday || "";
    const { password, seedPassword, ...safeStudent } = student;

    return {
        ...safeStudent,
        passwordHash: student.passwordHash || await hashPassword(plainPassword)
    };
}

studentSchema.statics.migratePlainPasswords = async function migratePlainPasswords() {
    const studentsWithPlainPassword = await this.find({
        password: { $exists: true, $ne: "" }
    })
        .select("+password +passwordHash")
        .lean();

    await Promise.all(studentsWithPlainPassword.map(async student => {
        const updates = {
            $unset: {
                password: ""
            }
        };

        if (!student.passwordHash) {
            updates.$set = {
                passwordHash: await hashPassword(student.password)
            };
        }

        return this.updateOne({ _id: student._id }, updates);
    }));
};

studentSchema.statics.seedInitial = async function seedInitial(students = []) {
    const count = await this.countDocuments();

    if (count > 0) {
        await this.migratePlainPasswords();
        return;
    }

    try {
        const studentsToInsert = await Promise.all(students.map(prepareSeedStudent));

        await this.insertMany(studentsToInsert);
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
    }

    await this.migratePlainPasswords();
};

module.exports = mongoose.model("Student", studentSchema);
