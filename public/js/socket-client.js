let globalSocket = null;

// Один глобальний socket використовується різними сторінками, щоб не створювати зайві підключення.
function connectGlobalSocket() {
    if (typeof io === "undefined") {
        return null;
    }

    if (globalSocket) {
        return globalSocket;
    }

    globalSocket = io();
    window.globalSocket = globalSocket;

    // Після reconnect оновлюємо таблицю, бо online/offline статуси могли змінитися.
    globalSocket.on("connect", () => {
        if (typeof refreshStudentsTable === "function") {
            refreshStudentsTable();
        }
    });

    globalSocket.on("connect_error", () => {
        // Unauthenticated public pages can load this script before login.
    });

    // Сповіщення та статуси слухаються глобально, навіть якщо користувач не на сторінці чату.
    globalSocket.on("notification:new", notification => {
        if (typeof addRealtimeNotification === "function") {
            addRealtimeNotification(notification);
        }
    });

    globalSocket.on("user:status", event => {
        if (typeof updateUserStatus === "function") {
            updateUserStatus(event.userId, event.status);
        }

        if (typeof updateStudentStatusInTable === "function") {
            updateStudentStatusInTable(event.userId, event.status);
        }
    });

    return globalSocket;
}

document.addEventListener("DOMContentLoaded", () => {
    connectGlobalSocket();

    if (typeof loadNotifications === "function") {
        loadNotifications();
    }
});
