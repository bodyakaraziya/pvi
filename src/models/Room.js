const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        name: {
            type: String,
            default: "",
            trim: true
        },
        type: {
            type: String,
            enum: ["direct", "group"],
            required: true
        },
        participants: {
            type: [String],
            default: []
        },
        createdBy: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model("Room", roomSchema);
