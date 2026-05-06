const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        roomId: {
            type: String,
            required: true,
            trim: true
        },
        senderId: {
            type: String,
            required: true,
            trim: true
        },
        senderName: {
            type: String,
            default: "",
            trim: true
        },
        text: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["sent", "read"],
            default: "sent"
        },
        readBy: {
            type: [String],
            default: []
        },
        reactions: {
            type: Map,
            of: [String],
            default: {}
        },
        editedAt: {
            type: Date,
            default: null
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model("Message", messageSchema);
