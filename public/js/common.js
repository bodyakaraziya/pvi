function initBellNavigation() {
    // Клік по дзвіночку веде в повідомлення, але кліки всередині dropdown не закривають його переходом.
    const notificationWrapper = document.getElementById("notification-wrapper");

    if (!notificationWrapper) {
        return;
    }

    notificationWrapper.addEventListener("click", event => {
        if (event.target.closest(".notification-dropdown")) {
            return;
        }

        window.location.href = "/messages";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initBellNavigation();
});

async function loadNotifications() {
    // Сповіщення завантажуються для header-дзвіночка на всіх приватних сторінках.
    const notificationList = document.querySelector(".notification-dropdown .notification-list");
    const notificationIndicator = document.querySelector(".notification-indicator");

    if (!notificationList || !notificationIndicator) {
        return;
    }

    try {
        const response = await fetch("/api/notifications");
        const data = await response.json();

        if (!response.ok || !data.success) {
            return;
        }

        renderNotifications(data.notifications);
    } catch (error) {
        console.error("Notifications loading error:", error);
    }
}

function renderNotifications(notifications = []) {
    // У dropdown показуємо тільки непрочитані повідомлення, прочитані не займають місце в UI.
    const notificationList = document.querySelector(".notification-dropdown .notification-list");
    const notificationIndicator = document.querySelector(".notification-indicator");

    if (!notificationList || !notificationIndicator) {
        return;
    }

    const unreadNotifications = notifications.filter(notification => !notification.isRead);
    notificationIndicator.style.display = unreadNotifications.length > 0 ? "block" : "none";

    if (unreadNotifications.length === 0) {
        notificationList.innerHTML = `
            <li class="notification-empty">
                <div class="user-block">
                    <span class="notification-name">No notifications</span>
                    <p class="notification-text">You have no new messages.</p>
                </div>
            </li>
        `;
        return;
    }

    notificationList.innerHTML = unreadNotifications.map(notification => {
        const title = getNotificationTitle(notification);
        const text = getNotificationText(notification);

        return `
            <li class="notification-item ${notification.isRead ? "" : "notification-unread"}"
                data-notification-id="${escapeHtml(notification.id)}"
                data-room-id="${escapeHtml(notification.roomId)}">

                <img src="/image/avatar.jpg"
                     alt="Avatar"
                     class="other-avatar-image"
                     onerror="this.remove()">

                <div class="user-block">
                    <span class="notification-name">${escapeHtml(title)}</span>
                    <p class="notification-text">${escapeHtml(text)}</p>
                </div>
            </li>
        `;
    }).join("");

    notificationList.querySelectorAll(".notification-item").forEach(item => {
        item.addEventListener("click", async event => {
            event.stopPropagation();

            const notificationId = item.dataset.notificationId;
            const roomId = item.dataset.roomId;

            if (notificationId) {
                await fetch(`/api/notifications/${notificationId}`, {
                    method: "DELETE"
                });
            }

            if (roomId) {
                const nextUrl = `/messages?roomId=${encodeURIComponent(roomId)}`;

                if (window.location.pathname === "/messages" && typeof openRoomFromNotification === "function") {
                    window.history.pushState(null, "", nextUrl);
                    await openRoomFromNotification(roomId);
                    await loadNotifications();
                    return;
                }

                window.location.href = nextUrl;
            } else {
                window.location.href = "/messages";
            }
        });
    });
}

function getNotificationTitle(notification) {
    // Для group-чату заголовком є назва кімнати, для direct — ім'я відправника.
    if (isGroupNotification(notification)) {
        return notification.roomName || "Group chat";
    }

    return notification.senderName || notification.roomName || "Unknown";
}

function getNotificationText(notification) {
    const text = notification.text || "";

    if (isGroupNotification(notification) && notification.senderName) {
        return `${notification.senderName}: ${text}`;
    }

    return text;
}

function isGroupNotification(notification) {
    return notification.roomType === "group";
}

async function addRealtimeNotification(notification) {
    // Якщо користувач уже дивиться цей чат, нове сповіщення одразу прибираємо з дзвіночка.
    const currentPath = window.location.pathname;
    const currentRoomId = window.currentRoomId || null;

    const isCurrentOpenedChat =
        currentPath === "/messages" &&
        currentRoomId === notification.roomId &&
        document.visibilityState === "visible";

    if (isCurrentOpenedChat) {
        if (notification.id) {
            await fetch(`/api/notifications/${notification.id}`, {
                method: "DELETE"
            }).catch(() => {});
        }

        await loadNotifications();
        return;
    }

    if (typeof refreshRoomsWithLastMessage === "function") {
        await refreshRoomsWithLastMessage(notification.roomId).catch(() => {});
    }

    await loadNotifications();

    const notificationIndicator = document.querySelector(".notification-indicator");
    const bell = document.querySelector(".bell-icon");

    if (notificationIndicator) {
        notificationIndicator.style.display = "block";
    }

    if (bell) {
        bell.classList.add("ringing");

        setTimeout(() => {
            bell.classList.remove("ringing");
        }, 800);
    }
}

function escapeHtml(value) {
    // Захищає dropdown від HTML у тексті повідомлення або назві кімнати.
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();
});



function refreshStudentsTable() {
    // Викликається глобальним socket-client після reconnect або зміни статусу.
    if (typeof loadStudents === "function" && typeof currentPage !== "undefined") {
        loadStudents(currentPage);
    }
}

function initBurgerMenu() {
    // На мобільному відкриваємо sidebar, на desktop — згортаємо його.
    const burgerButton = document.querySelector(".burger");

    if (!burgerButton) {
        return;
    }

    burgerButton.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            document.body.classList.toggle("sidebar-open");
        } else {
            document.body.classList.toggle("sidebar-collapsed");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initBurgerMenu();
});
