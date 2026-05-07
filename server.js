require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const pageRoutes = require("./src/routes/page.routes");
const authRoutes = require("./src/routes/auth.routes");
const studentRoutes = require("./src/routes/student.routes");
const roomRoutes = require("./src/routes/room.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const registerChatSocket = require("./src/sockets/chat.socket");
const connectDB = require("./src/config/db");
const { ensureInitialStudents } = require("./src/services/student.service");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/", pageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/notifications", notificationRoutes);

registerChatSocket(io);

async function startServer() {
    await connectDB();
    await ensureInitialStudents();

    server.listen(PORT, () => {
        console.log(`Server started: http://localhost:${PORT}`);
    });
}

startServer();
