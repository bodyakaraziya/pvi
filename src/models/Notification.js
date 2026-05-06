const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        recipientId: {
            type: String,
            required: true,
            trim: true
        },
        roomId: {
            type: String,
            required: true,
            trim: true
        },
        roomName: {
            type: String,
            default: "Chat",
            trim: true
        },
        roomType: {
            type: String,
            enum: ["direct", "group"],
            default: "direct"
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
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model("Notification", notificationSchema);
