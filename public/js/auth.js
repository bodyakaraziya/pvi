async function getCurrentUser() {
    try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Помилка отримання поточного користувача:", error);
        return null;
    }
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);

    if (!input) {
        return;
    }

    const shouldShowPassword = input.type === "password";
    input.type = shouldShowPassword ? "text" : "password";

    const eyeOpen = button?.querySelector(".eye-open");
    const eyeClosed = button?.querySelector(".eye-closed");

    if (eyeOpen) {
        eyeOpen.style.display = shouldShowPassword ? "none" : "";
    }

    if (eyeClosed) {
        eyeClosed.style.display = shouldShowPassword ? "" : "none";
    }
}

function openLoginModal() {
    const modal = document.getElementById("login-modal");

    if (!modal) {
        return;
    }

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");

    if (!modal) {
        return;
    }

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

async function updateAuthUI(){
    const user = await getCurrentUser();

    const loginButton = document.getElementById("login-open-btn");
    const userProfile = document.getElementById("user-profile");
    const userName = document.getElementById("current-user-name");
    const notificationWrapper = document.getElementById("notification-wrapper");

    if (!user) {
        if (loginButton) loginButton.hidden = false;
        if (userProfile) userProfile.hidden = true;
        if (notificationWrapper) notificationWrapper.hidden = true;
        return null;
    }

    if (loginButton) loginButton.hidden = true;
    if (userProfile) userProfile.hidden = false;
    if (notificationWrapper) notificationWrapper.hidden = false;

    if (userName) {
        userName.textContent = `${user.firstName} ${user.lastName || ""}`.trim();
    }

    return user;
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    const username = document.getElementById("login-username")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();

    if (!username || !password) {
        alert("Введіть логін і пароль");
        return;
    }

    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message || "Помилка авторизації");
        return;
    }

    closeLoginModal();

    setTimeout(async () => {
        await updateAuthUI();
    }, 100);

    window.location.reload();
}

async function logout() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST"
        });

        window.location.href = "/students";
    } catch (error) {
        console.error("Помилка виходу:", error);
    }
}

function initAuth() {
    updateAuthUI();

    const loginOpenButton = document.getElementById("login-open-btn");
    const loginForm = document.getElementById("login-form");
    const logoutButton = document.getElementById("logout-btn");

    const closeLoginButton = document.getElementById("close-login-modal");
    const cancelLoginButton = document.getElementById("cancel-login");

    if (loginOpenButton) {
        loginOpenButton.addEventListener("click", openLoginModal);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    if (closeLoginButton) {
        closeLoginButton.addEventListener("click", closeLoginModal);
    }

    if (cancelLoginButton) {
        cancelLoginButton.addEventListener("click", closeLoginModal);
    }
}

window.togglePasswordVisibility = togglePasswordVisibility;

document.addEventListener("DOMContentLoaded", initAuth);
