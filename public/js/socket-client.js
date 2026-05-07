let globalSocket = null;

function connectGlobalSocket() {
    if (typeof io === "undefined") {
        return null;
    }

    if (globalSocket) {
        return globalSocket;
    }

    globalSocket = io();
    window.globalSocket = globalSocket;

    globalSocket.on("connect", () => {
        if (typeof refreshStudentsTable === "function") {
            refreshStudentsTable();
        }
    });

    globalSocket.on("connect_error", () => {
        // Unauthenticated public pages can load this script before login.
    });

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
