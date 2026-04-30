let socket = null;
let currentRoomId = null;
let currentUser = null;
let roomsCache = [];
let availableStudents = [];
let typingTimer = null;
let isTyping = false;

window.currentRoomId = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function initMessagesPage() {
    currentUser = await getCurrentUser();

    if (!currentUser) {
        window.location.href = "/students?auth_required=1";
        return;
    }

    initSocket();
    await loadRooms();

    const roomIdFromUrl = getRoomIdFromUrl();
    const pendingRoomId = localStorage.getItem("pendingRoomId");

    if (pendingRoomId) {
        localStorage.removeItem("pendingRoomId");
    }

    const roomIdToOpen = roomIdFromUrl || pendingRoomId;

    if (roomIdToOpen && roomsCache.some(room => room.id === roomIdToOpen)) {
        openRoom(roomIdToOpen);
    } else if (roomsCache.length > 0) {
        openRoom(roomsCache[0].id);
    } else {
        currentRoomId = null;
        window.currentRoomId = null;
        document.getElementById("chat-room-title").textContent = "Select chat";
        document.getElementById("chat-members-list").innerHTML = "";
        document.getElementById("chat-messages").innerHTML =
            `<div class="empty-chat-message">Оберіть або створіть чат</div>`;
    }

    document.getElementById("chat-message-form")?.addEventListener("submit", handleSendMessage);
    document.getElementById("chat-message-input")?.addEventListener("input", handleTyping);
    document.getElementById("new-chat-room-btn")?.addEventListener("click", openNewChatModal);
    document.getElementById("close-new-chat-modal")?.addEventListener("click", closeNewChatModal);
    document.getElementById("cancel-new-chat")?.addEventListener("click", closeNewChatModal);
    document.getElementById("new-chat-form")?.addEventListener("submit", handleCreateRoom);
}

function initSocket() {
    socket = window.globalSocket || io();
    window.globalSocket = socket;

    if (socket.__messagesHandlersAttached) {
        return;
    }

    socket.__messagesHandlersAttached = true;

    socket.on("connect", () => {});

    socket.on("room:history", ({ roomId, messages }) => {
        if (roomId !== currentRoomId) return;
        renderMessages(messages);
    });

    socket.on("message:new", message => {
        updateRoomLastMessage(message);

        if (message.roomId !== currentRoomId) {
            return;
        }

        appendMessage(message);

        if (currentUser && message.senderId !== currentUser.id) {
            socket.emit("room:read", {
                roomId: currentRoomId
            });

            fetch(`/api/notifications/room/${currentRoomId}`, {
                method: "DELETE"
            }).then(() => {
                if (typeof loadNotifications === "function") {
                    loadNotifications();
                }
            });
        }
    });

    socket.on("room:update", room => {
        handleRealtimeRoomUpdate(room);
    });

    socket.on("user:status", ({ userId, status }) => {
        updateUserStatus(userId, status);

        if (typeof updateStudentStatusInTable === "function") {
            updateStudentStatusInTable(userId, status);
        }
    });

    socket.on("typing:start", ({ roomId, userId, userName }) => {
        if (roomId !== currentRoomId) return;
        if (currentUser && userId === currentUser.id) return;

        showTypingIndicator(userName);
    });

    socket.on("typing:stop", ({ roomId, userId }) => {
        if (roomId !== currentRoomId) return;
        if (currentUser && userId === currentUser.id) return;

        hideTypingIndicator();
    });

    socket.on("message:status:update", ({ roomId, messages }) => {
        if (roomId !== currentRoomId) {
            return;
        }

        messages.forEach(message => {
            updateMessageStatus(message.id, message.status);
        });
    });
}

async function loadRooms() {
    const response = await fetch("/api/rooms");
    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || "Не вдалося завантажити чати");
        return;
    }

    roomsCache = data.rooms;
    renderRooms(data.rooms);
}

function getRoomActivityTime(room) {
    return new Date(room.lastMessage?.createdAt || room.createdAt || 0).getTime();
}

function sortRoomsCache() {
    roomsCache.sort((a, b) => getRoomActivityTime(b) - getRoomActivityTime(a));
}

function getRoomIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId");
}

function getOtherParticipants(room) {
    if (!currentUser) {
        return [];
    }

    return room.participants.filter(participant => participant.id !== currentUser.id);
}

function isRoomOnline(room) {
    return getOtherParticipants(room).some(participant => participant.status === "online");
}

function renderRooms(rooms) {
    const list = document.getElementById("chat-room-list");
    if (!list) return;

    if (!rooms.length) {
        list.innerHTML = `<li class="chat-room-empty">Чатів поки немає</li>`;
        return;
    }

    list.innerHTML = rooms.map(room => {
        const isActive = room.id === currentRoomId;
        const isOnline = isRoomOnline(room);
        const lastMessagePreview = getRoomLastMessagePreview(room);

        return `
        <li class="chat-room-item ${isActive ? "active" : ""}" data-room-id="${escapeHtml(room.id)}">
            <img
                src="/image/avatar.jpg"
                alt="Avatar"
                class="other-avatar-image room-avatar ${isOnline ? "room-avatar--online" : "room-avatar--offline"}"
            >
            <div class="user-block">
                <span class="notification-name">${escapeHtml(room.name)}</span>
                <p class="notification-text chat-room-last-message">${escapeHtml(lastMessagePreview)}</p>
            </div>
        </li>
    `;
    }).join("");

    list.querySelectorAll(".chat-room-item").forEach(item => {
        item.addEventListener("click", () => {
            openRoom(item.dataset.roomId);
        });
    });
}

function getRoomLastMessagePreview(room) {
    const lastMessage = room.lastMessage;

    if (!lastMessage) {
        return "No messages yet";
    }

    const text = String(lastMessage.text || "").trim();

    if (room.type === "group" && lastMessage.senderName) {
        return `${lastMessage.senderName}: ${text}`;
    }

    return text;
}

function updateRoomLastMessage(message) {
    if (!message?.roomId) {
        return;
    }

    const room = roomsCache.find(item => item.id === message.roomId);

    if (!room) {
        return;
    }

    room.lastMessage = message;
    sortRoomsCache();
    renderRooms(roomsCache);
}

function handleRealtimeRoomUpdate(room) {
    if (!room?.id) {
        return;
    }

    const existingIndex = roomsCache.findIndex(item => item.id === room.id);

    if (existingIndex === -1) {
        roomsCache.push(room);
    } else {
        roomsCache[existingIndex] = {
            ...roomsCache[existingIndex],
            ...room
        };
    }

    sortRoomsCache();
    renderRooms(roomsCache);

    if (room.id === currentRoomId) {
        document.getElementById("chat-room-title").textContent = room.name;
        renderMembers(room.participants);
    }
}

function openRoom(roomId) {
    const room = roomsCache.find(item => item.id === roomId);

    if (!room || !socket) {
        return;
    }

    currentRoomId = roomId;
    window.currentRoomId = roomId;
    window.activeRoomId = roomId;

    document.getElementById("chat-room-title").textContent = room.name;
    renderMembers(room.participants);
    renderRooms(roomsCache);
    hideTypingIndicator();

    socket.emit("room:join", {
        roomId
    });

    socket.emit("room:read", {
        roomId
    });

    fetch(`/api/notifications/room/${roomId}`, {
        method: "DELETE"
    }).then(() => {
        if (typeof loadNotifications === "function") {
            loadNotifications();
        }
    });
}

async function openRoomFromNotification(roomId) {
    if (!roomsCache.some(room => room.id === roomId)) {
        await loadRooms();
    }

    openRoom(roomId);
}

async function refreshRoomsWithLastMessage(roomId = null) {
    await loadRooms();

    if (roomId && currentRoomId === roomId) {
        const activeRoom = roomsCache.find(room => room.id === roomId);

        if (activeRoom) {
            document.getElementById("chat-room-title").textContent = activeRoom.name;
            renderMembers(activeRoom.participants);
        }
    }
}

function renderMembers(participants) {
    const container = document.getElementById("chat-members-list");

    if (!container) {
        return;
    }

    container.innerHTML = participants.map(user => {
        const fullName = `${user.firstName} ${user.lastName || ""}`.trim();
        const isCurrent = user.id === currentUser.id;

        return `
            <div class="chat-member ${isCurrent ? "current-user" : ""}" data-user-id="${escapeHtml(user.id)}">
                <span class="chat-user-status ${user.status === "online" ? "status--online" : "status--offline"}"></span>
                <span>${escapeHtml(fullName)}</span>
                ${isCurrent ? `<span class="current-user-label">you</span>` : ""}
            </div>
        `;
    }).join("");
}

function updateUserStatus(userId, status) {
    document.querySelectorAll(`[data-user-id="${CSS.escape(String(userId))}"]`).forEach(element => {
        const statusElement = element.querySelector(".chat-user-status");

        if (!statusElement) {
            return;
        }

        statusElement.classList.remove("status--online", "status--offline");
        statusElement.classList.add(status === "online" ? "status--online" : "status--offline");
    });

    roomsCache.forEach(room => {
        room.participants.forEach(participant => {
            if (participant.id === userId) {
                participant.status = status;
            }
        });
    });

    renderRooms(roomsCache);
}

function renderMessages(messages) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    container.innerHTML = messages.map(message => getMessageHtml(message)).join("");
    container.scrollTop = container.scrollHeight;
}

function updateMessageStatus(messageId, status) {
    const messageElement = document.querySelector(
        `.chat-message[data-message-id="${CSS.escape(messageId)}"]`
    );

    if (!messageElement) {
        return;
    }

    const statusElement = messageElement.querySelector(".message-status");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = status;
}

function appendMessage(message) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    container.insertAdjacentHTML("beforeend", getMessageHtml(message));
    container.scrollTop = container.scrollHeight;
}

function getMessageHtml(message) {
    const isOwn = message.senderId === currentUser.id;

    return `
        <div class="chat-message ${isOwn ? "chat-message-own" : "chat-message-other"}"
             data-message-id="${escapeHtml(message.id)}">
            <div class="chat-message-author">${escapeHtml(message.senderName)}</div>
            <div class="chat-message-text">${escapeHtml(message.text)}</div>
            <div class="chat-message-status message-status">
                ${escapeHtml(message.status || "sent")}
            </div>
        </div>
    `;
}

function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById("chat-message-input");
    const text = input.value.trim();

    if (!text || !currentRoomId || !socket) return;

    socket.emit("message:send", {
        roomId: currentRoomId,
        text
    });

    input.value = "";

    isTyping = false;
    clearTimeout(typingTimer);

    socket.emit("typing:stop", {
        roomId: currentRoomId
    });
}

function handleTyping() {
    if (!socket || !currentRoomId) {
        return;
    }

    if (!isTyping) {
        isTyping = true;

        socket.emit("typing:start", {
            roomId: currentRoomId
        });
    }

    clearTimeout(typingTimer);

    typingTimer = setTimeout(() => {
        isTyping = false;

        socket.emit("typing:stop", {
            roomId: currentRoomId
        });
    }, 1000);
}

function showTypingIndicator(userName) {
    const indicator = document.getElementById("typing-indicator");

    if (!indicator) {
        return;
    }

    indicator.textContent = `${userName} пише...`;
    indicator.style.display = "block";
}

function hideTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");

    if (!indicator) {
        return;
    }

    indicator.textContent = "";
    indicator.style.display = "none";
}

async function openNewChatModal() {
    const modal = document.getElementById("new-chat-modal");
    const error = document.getElementById("new-chat-error");

    if (error) {
        error.textContent = "";
    }

    if (modal) {
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
    }

    await loadAvailableStudents();
}

function closeNewChatModal() {
    const modal = document.getElementById("new-chat-modal");
    const form = document.getElementById("new-chat-form");

    if (form) {
        form.reset();
    }

    if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
}

async function loadAvailableStudents() {
    const container = document.getElementById("new-chat-students-list");

    if (!container) {
        return;
    }

    container.innerHTML = `<p>Loading...</p>`;

    const response = await fetch("/api/students?limit=1000");
    const data = await response.json();

    if (!response.ok || !data.success) {
        container.innerHTML = `<p>Не вдалося завантажити студентів</p>`;
        return;
    }

    availableStudents = data.students.filter(student => student.id !== currentUser.id);

    if (availableStudents.length === 0) {
        container.innerHTML = `<p>Немає доступних студентів</p>`;
        return;
    }

    container.innerHTML = availableStudents.map(student => {
        const fullName = `${student.firstName} ${student.lastName || ""}`.trim();
        
        return `
        <label class="new-chat-student">
            <input type="checkbox" value="${escapeHtml(student.id)}">
            <span class="new-chat-student-name">${escapeHtml(fullName)}</span>
        </label>
    `;
    }).join("");
}

async function handleCreateRoom(event) {
    event.preventDefault();

    const nameInput = document.getElementById("new-chat-name");
    const error = document.getElementById("new-chat-error");

    const selectedIds = Array.from(
        document.querySelectorAll("#new-chat-students-list input[type='checkbox']:checked")
    ).map(input => input.value);

    if (selectedIds.length === 0) {
        if (error) {
            error.textContent = "Оберіть хоча б одного студента";
        }

        return;
    }

    const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: nameInput?.value || "",
            participantIds: selectedIds
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        if (error) {
            error.textContent = data.message || "Не вдалося створити чат";
        }

        return;
    }

    closeNewChatModal();

    await loadRooms();

    if (data.room?.id) {
        openRoom(data.room.id);
    }
}

window.openRoomFromNotification = openRoomFromNotification;
window.refreshRoomsWithLastMessage = refreshRoomsWithLastMessage;
window.handleRealtimeRoomUpdate = handleRealtimeRoomUpdate;

document.addEventListener("DOMContentLoaded", initMessagesPage);
