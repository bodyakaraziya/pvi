const mongoose = require("mongoose");

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
        password: {
            type: String,
            required: true
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

studentSchema.statics.seedInitial = async function seedInitial(students = []) {
    const count = await this.countDocuments();

    if (count > 0) {
        return;
    }

    try {
        await this.insertMany(students);
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
    }
};

module.exports = mongoose.model("Student", studentSchema);
