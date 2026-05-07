let socket = null;
let currentRoomId = null;
let currentUser = null;
let roomsCache = [];
let availableStudents = [];
let typingTimer = null;
let isTyping = false;
let modalMode = "create";
// Кеші потрібні, щоб швидко оновлювати повідомлення без повного перезавантаження кімнати.
let messagesCache = new Map();
let roomMessagesCache = new Map();

const reactionOptions = ["👍", "❤️", "😂", "😮", "✅"];

window.currentRoomId = null;

// Екрануємо користувацький текст перед вставкою в HTML, щоб уникнути XSS.
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function initMessagesPage() {
    // Сторінка повідомлень приватна: без користувача повертаємо на /students.
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
    } else {
        currentRoomId = null;
        window.currentRoomId = null;
        document.getElementById("chat-room-title").textContent = "Select chat";
        document.getElementById("chat-members-list").innerHTML = "";
        document.getElementById("chat-messages").innerHTML =
            `<div class="empty-chat-message">Оберіть або створіть чат</div>`;
    }

    if (!currentRoomId) {
        setChatOpenState(false);
    }

    document.getElementById("chat-message-form")?.addEventListener("submit", handleSendMessage);
    document.getElementById("chat-message-input")?.addEventListener("input", handleTyping);
    document.getElementById("chat-messages")?.addEventListener("click", handleMessageInteraction);
    document.getElementById("new-chat-room-btn")?.addEventListener("click", openNewChatModal);
    document.getElementById("add-room-members-btn")?.addEventListener("click", openAddMembersModal);
    document.getElementById("close-chat-btn")?.addEventListener("click", closeCurrentRoom);
    document.getElementById("close-new-chat-modal")?.addEventListener("click", closeNewChatModal);
    document.getElementById("cancel-new-chat")?.addEventListener("click", closeNewChatModal);
    document.getElementById("new-chat-form")?.addEventListener("submit", handleCreateRoom);
}

function initSocket() {
    socket = window.globalSocket || io();
    window.globalSocket = socket;

    // Захист від повторної реєстрації handlers після reload частин сторінки.
    if (socket.__messagesHandlersAttached) {
        return;
    }

    socket.__messagesHandlersAttached = true;

    socket.on("connect", () => {});

    socket.on("room:history", ({ roomId, messages }) => {
        // Ігноруємо історію неактивної кімнати, якщо користувач уже перейшов в інший чат.
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

    socket.on("message:update", message => {
        updateRoomLastMessage(message);

        if (message.roomId !== currentRoomId) {
            return;
        }

        updateMessageElement(message);
    });

    socket.on("message:error", ({ message }) => {
        if (message) {
            alert(message);
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
    // Список кімнат приходить вже відформатованим для поточного користувача.
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
    // Ліва колонка чату перемальовується після нових повідомлень, статусів і створення кімнат.
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
    // Останнє повідомлення впливає і на прев'ю, і на порядок кімнат у списку.
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
    // Оновлення кімнати може прийти як для вже відомого чату, так і для щойно створеного.
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

function setChatOpenState(isOpen) {
    document.querySelector(".messages-layout")?.classList.toggle("chat-open", isOpen);
    document.getElementById("chat-message-input")?.toggleAttribute("disabled", !isOpen);
    document.getElementById("send-message-btn")?.toggleAttribute("disabled", !isOpen);
    document.getElementById("close-chat-btn")?.toggleAttribute("hidden", !isOpen);
    document.getElementById("add-room-members-btn")?.toggleAttribute("hidden", !isOpen);
}

function closeCurrentRoom() {
    if (currentRoomId && socket) {
        socket.emit("room:leave", {
            roomId: currentRoomId
        });
    }

    currentRoomId = null;
    window.currentRoomId = null;
    window.activeRoomId = null;

    document.getElementById("chat-room-title").textContent = "Select chat";
    document.getElementById("chat-members-list").innerHTML = "";
    document.getElementById("chat-messages").innerHTML =
        `<div class="empty-chat-message">Оберіть чат зі списку</div>`;

    hideTypingIndicator();
    setChatOpenState(false);
    renderRooms(roomsCache);

    if (window.location.pathname === "/messages") {
        window.history.replaceState(null, "", "/messages");
    }
}

function openRoom(roomId) {
    // Відкриття кімнати синхронізує UI, URL-стан, Socket.IO room і прочитаність сповіщень.
    const room = roomsCache.find(item => item.id === roomId);

    if (!room || !socket) {
        return;
    }

    currentRoomId = roomId;
    window.currentRoomId = roomId;
    window.activeRoomId = roomId;

    document.getElementById("chat-room-title").textContent = room.name;
    renderMembers(room.participants);
    setChatOpenState(true);
    renderRooms(roomsCache);
    hideTypingIndicator();

    const cachedMessages = getCachedRoomMessages(roomId);
    const container = document.getElementById("chat-messages");

    if (container) {
        if (cachedMessages.length > 0) {
            container.innerHTML = cachedMessages.map(message => getMessageHtml(message)).join("");
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = `<div class="empty-chat-message">Loading messages...</div>`;
        }
    }

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
    // Якщо перехід прийшов зі сповіщення, потрібної кімнати може ще не бути в кеші.
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
        const fullName = getUserFullName(user);
        const isCurrent = user.id === currentUser.id;
        const isOnline = user.status === "online";

        return `
            <div class="chat-member ${isCurrent ? "current-user" : ""}" data-user-id="${escapeHtml(user.id)}">
                <span class="chat-member-avatar ${isOnline ? "chat-member-avatar--online" : ""}">
                    ${escapeHtml(getUserInitials(user))}
                </span>
                <span class="chat-member-info">
                    <span class="chat-member-name">${escapeHtml(fullName)}</span>
                    <span class="chat-member-status-label">
                        <span class="chat-user-status ${isOnline ? "status--online" : "status--offline"}"></span>
                        <span class="chat-member-presence-text">${isOnline ? "online" : "offline"}</span>
                    </span>
                </span>
                ${isCurrent ? `<span class="current-user-label">you</span>` : ""}
            </div>
        `;
    }).join("");
}

function getUserFullName(user) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
}

function getUserInitials(user) {
    const firstName = String(user.firstName || "").trim();
    const lastName = String(user.lastName || "").trim();
    const initials = `${firstName[0] || ""}${lastName[0] || ""}`.trim();

    return initials || "?";
}

function updateUserStatus(userId, status) {
    // Статус треба оновити і в списку учасників відкритого чату, і в кеші кімнат.
    document.querySelectorAll(`[data-user-id="${CSS.escape(String(userId))}"]`).forEach(element => {
        const statusElement = element.querySelector(".chat-user-status");

        if (!statusElement) {
            return;
        }

        statusElement.classList.remove("status--online", "status--offline");
        statusElement.classList.add(status === "online" ? "status--online" : "status--offline");

        const statusLabel = element.querySelector(".chat-member-presence-text");

        if (statusLabel) {
            statusLabel.textContent = status === "online" ? "online" : "offline";
        }

        const avatar = element.querySelector(".chat-member-avatar");

        if (avatar) {
            avatar.classList.toggle("chat-member-avatar--online", status === "online");
        }
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
    // Повна історія кімнати замінює DOM і паралельно оновлює локальний кеш повідомлень.
    const container = document.getElementById("chat-messages");
    if (!container) return;

    cacheMessages(messages);
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

    statusElement.innerHTML = getMessageStatusHtml(status);
}

function appendMessage(message) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    cacheMessage(message);
    container.insertAdjacentHTML("beforeend", getMessageHtml(message));
    container.scrollTop = container.scrollHeight;
}

function cacheMessages(messages) {
    messages.forEach(cacheMessage);
}

function getCachedRoomMessages(roomId) {
    const roomMap = roomMessagesCache.get(roomId);
    if (!roomMap) {
        return [];
    }

    return [...roomMap.values()]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function updateMessageElement(message) {
    // Після редагування, видалення або реакції перемальовуємо тільки одне повідомлення.
    cacheMessage(message);

    const messageElement = document.querySelector(
        `.chat-message[data-message-id="${CSS.escape(message.id)}"]`
    );

    if (!messageElement) {
        appendMessage(message);
        return;
    }

    messageElement.outerHTML = getMessageHtml(message);
}

function cacheMessage(message) {
    // Один кеш шукає повідомлення за id, другий тримає повідомлення окремо для кожної кімнати.
    if (!message?.id || !message?.roomId) {
        return;
    }

    messagesCache.set(message.id, message);

    const roomMap = roomMessagesCache.get(message.roomId) || new Map();
    roomMap.set(message.id, message);
    roomMessagesCache.set(message.roomId, roomMap);
}

function getMessageHtml(message) {
    // HTML повідомлення залежить від автора, стану видалення, реакцій і статусу прочитання.
    const isOwn = message.senderId === currentUser.id;
    const isDeleted = Boolean(message.deletedAt);
    const editedLabel = message.editedAt && !isDeleted
        ? `<span class="message-edited">edited</span>`
        : "";
    const actionButtons = isOwn && !isDeleted
        ? `
            <button type="button" class="message-action-btn message-edit-btn" data-message-id="${escapeHtml(message.id)}">Edit</button>
            <button type="button" class="message-action-btn message-delete-btn" data-message-id="${escapeHtml(message.id)}">Delete</button>
        `
        : "";
    const reactionPicker = !isDeleted
        ? `
            <div class="message-reaction-picker">
                ${reactionOptions.map(emoji => `
                    <button type="button"
                            class="message-reaction-option"
                            data-message-id="${escapeHtml(message.id)}"
                            data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>
                `).join("")}
            </div>
        `
        : "";
    const reactionsHtml = getMessageReactionsHtml(message);

    return `
        <div class="chat-message ${isOwn ? "chat-message-own" : "chat-message-other"}"
             data-message-id="${escapeHtml(message.id)}">
            <div class="chat-message-author">${escapeHtml(message.senderName)}</div>
            <div class="chat-message-text ${isDeleted ? "chat-message-text--deleted" : ""}">
                ${escapeHtml(message.text)}
            </div>
            <div class="message-footer">
                <div class="message-reactions-summary">
                    ${reactionsHtml}
                </div>
                <div class="message-meta">
                    ${editedLabel}
                    <span class="message-time">${formatMessageTime(message.createdAt)}</span>
                    ${isOwn ? `<span class="chat-message-status message-status">${getMessageStatusHtml(message.status)}</span>` : ""}
                </div>
            </div>
            <div class="message-actions">
                ${reactionPicker}
                ${actionButtons}
            </div>
        </div>
    `;
}

function getMessageStatusHtml(status) {
    const normalizedStatus = status === "read" ? "read" : "sent";
    const label = normalizedStatus === "read" ? "Read" : "Sent";
    const icon = normalizedStatus === "read" ? "✓✓" : "✓";

    return `<span class="message-status-icon message-status-icon--${normalizedStatus}" title="${label}" aria-label="${label}">${icon}</span>`;
}

function getMessageReactionsHtml(message) {
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    const visibleReactions = reactions.filter(reaction => reaction.count > 0);

    if (visibleReactions.length === 0) {
        return "";
    }

    return `
        <div class="message-reactions">
            ${visibleReactions.map(reaction => {
                const isOwnReaction = reaction.userIds?.includes(currentUser.id);

                return `
                    <button type="button"
                            class="message-reaction ${isOwnReaction ? "active" : ""}"
                            data-message-id="${escapeHtml(message.id)}"
                            data-emoji="${escapeHtml(reaction.emoji)}">
                        <span>${escapeHtml(reaction.emoji)}</span>
                        <span>${escapeHtml(reaction.count)}</span>
                    </button>
                `;
            }).join("")}
        </div>
    `;
}

function formatMessageTime(createdAt) {
    if (!createdAt) {
        return "";
    }

    return new Date(createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function handleMessageInteraction(event) {
    // Делегування кліків дозволяє працювати з повідомленнями, доданими після першого render.
    const reactionButton = event.target.closest(".message-reaction-option, .message-reaction");

    if (reactionButton) {
        socket?.emit("message:reaction", {
            messageId: reactionButton.dataset.messageId,
            emoji: reactionButton.dataset.emoji
        });
        return;
    }

    const editButton = event.target.closest(".message-edit-btn");

    if (editButton) {
        const message = messagesCache.get(editButton.dataset.messageId);

        if (!message || message.senderId !== currentUser.id || message.deletedAt) {
            return;
        }

        const nextText = prompt("Edit message", message.text);

        if (nextText === null) {
            return;
        }

        socket?.emit("message:edit", {
            messageId: message.id,
            text: nextText
        });
        return;
    }

    const deleteButton = event.target.closest(".message-delete-btn");

    if (deleteButton) {
        const message = messagesCache.get(deleteButton.dataset.messageId);

        if (!message || message.senderId !== currentUser.id || message.deletedAt) {
            return;
        }

        if (!confirm("Delete this message?")) {
            return;
        }

        socket?.emit("message:delete", {
            messageId: message.id
        });
    }
}

function handleSendMessage(event) {
    // Повідомлення надсилається через socket, щоб усі учасники отримали його в realtime.
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
    // Typing indicator має debounce: після паузи в наборі відправляємо typing:stop.
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
    // Один modal використовується у двох режимах: створення кімнати та додавання учасників.
    modalMode = "create";
    prepareChatModal({
        title: "New chat room",
        submitText: "Create",
        showNameField: true
    });

    await openChatModal();
}

async function openAddMembersModal() {
    if (!currentRoomId) {
        return;
    }

    modalMode = "add";
    prepareChatModal({
        title: "Add members",
        submitText: "Add",
        showNameField: false
    });

    await openChatModal();
}

function prepareChatModal({ title, submitText, showNameField }) {
    const modalTitle = document.getElementById("new-chat-modal-title");
    const submitButton = document.getElementById("new-chat-submit-btn");
    const nameInput = document.getElementById("new-chat-name");
    const nameGroup = nameInput?.closest(".form-group");

    if (modalTitle) {
        modalTitle.textContent = title;
    }

    if (submitButton) {
        submitButton.textContent = submitText;
    }

    if (nameGroup) {
        nameGroup.style.display = showNameField ? "" : "none";
    }
}

async function openChatModal() {
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

    modalMode = "create";
    prepareChatModal({
        title: "New chat room",
        submitText: "Create",
        showNameField: true
    });
}

async function loadAvailableStudents() {
    // У списку не показуємо себе або вже доданих учасників поточної кімнати.
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

    const currentRoom = roomsCache.find(room => room.id === currentRoomId);
    const existingParticipantIds = new Set(
        modalMode === "add"
            ? (currentRoom?.participants || []).map(participant => participant.id)
            : [currentUser.id]
    );

    availableStudents = data.students.filter(student => !existingParticipantIds.has(student.id));

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
    // Обробник форми сам вирішує, створити новий чат чи додати учасників у поточний.
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

    if (modalMode === "add") {
        handleAddMembers(selectedIds, error);
        return;
    }

    if (socket) {
        handleCreateRoomViaSocket(nameInput?.value || "", selectedIds, error);
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

function handleCreateRoomViaSocket(name, selectedIds, error) {
    // Socket-варіант дає миттєве оновлення кімнат для всіх учасників.
    socket.emit("room:create", {
        name,
        participantIds: selectedIds
    }, async result => {
        if (!result?.success) {
            if (error) {
                error.textContent = result?.message || "Не вдалося створити чат";
            }

            return;
        }

        closeNewChatModal();
        await loadRooms();

        if (result.room?.id) {
            openRoom(result.room.id);
        }
    });
}

function handleAddMembers(selectedIds, error) {
    // Додавання учасників іде тільки через socket, бо кімната має оновитись у всіх відкритих клієнтах.
    if (!socket || !currentRoomId) {
        if (error) {
            error.textContent = "Socket connection is not ready";
        }

        return;
    }

    socket.emit("room:participants:add", {
        roomId: currentRoomId,
        participantIds: selectedIds
    }, async result => {
        if (!result?.success) {
            if (error) {
                error.textContent = result?.message || "Не вдалося додати учасників";
            }

            return;
        }

        closeNewChatModal();
        await loadRooms();
        openRoom(currentRoomId);
    });
}

window.openRoomFromNotification = openRoomFromNotification;
window.refreshRoomsWithLastMessage = refreshRoomsWithLastMessage;
window.handleRealtimeRoomUpdate = handleRealtimeRoomUpdate;

document.addEventListener("DOMContentLoaded", initMessagesPage);
