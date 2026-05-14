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

function getPasswordToggleButton(inputId) {
    return `
        <button type="button" class="btn-toggle-password" aria-label="Show or hide password"
            onclick="togglePasswordVisibility('${inputId}', this)">
            <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                fill="currentColor" viewBox="0 0 16 16">
                <path
                    d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                <path
                    d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
            </svg>

            <svg class="eye-closed" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20"
                height="20" fill="currentColor" viewBox="0 0 16 16">
                <path
                    d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z" />
                <path
                    d="M14.793 14.793a.5.5 0 0 1-.707 0l-14-14a.5.5 0 0 1 .707-.707l14 14a.5.5 0 0 1 0 .707" />
            </svg>
        </button>
    `;
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
    showLoginForm();
}

function initRegisterFormMarkup() {
    const loginForm = document.getElementById("login-form");
    const modalFooter = document.querySelector("#login-modal .modal-footer");

    if (!loginForm || !modalFooter || document.getElementById("register-form")) {
        return;
    }

    loginForm.insertAdjacentHTML("afterend", `
        <form id="register-form" hidden>
            <div class="form-group">
                <label for="register-group">Group</label>
                <select id="register-group" class="form-control" required>
                    <option value="" disabled selected>Select Group</option>
                    <option value="PZ-21">PZ-21</option>
                    <option value="PZ-22">PZ-22</option>
                    <option value="PZ-23">PZ-23</option>
                    <option value="PZ-24">PZ-24</option>
                    <option value="PZ-25">PZ-25</option>
                    <option value="PZ-26">PZ-26</option>
                </select>
            </div>

            <div class="form-group">
                <label for="register-first-name">First Name</label>
                <input type="text" id="register-first-name" class="form-control" required>
            </div>

            <div class="form-group">
                <label for="register-last-name">Last Name</label>
                <input type="text" id="register-last-name" class="form-control" required>
            </div>

            <div class="form-group">
                <label for="register-gender">Gender</label>
                <select id="register-gender" class="form-control" required>
                    <option value="" disabled selected>Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                </select>
            </div>

            <div class="form-group">
                <label for="register-birthday">Birthday</label>
                <input type="date" id="register-birthday" class="form-control" min="1950-01-01" max="2010-12-31" required>
            </div>

            <div class="form-group">
                <label for="register-password">Password</label>
                <div class="password-wrapper">
                    <input type="password" id="register-password" class="form-control" required>
                    ${getPasswordToggleButton("register-password")}
                </div>
            </div>

            <div class="form-group">
                <label for="register-confirm-password">Confirm</label>
                <div class="password-wrapper">
                    <input type="password" id="register-confirm-password" class="form-control" required>
                    ${getPasswordToggleButton("register-confirm-password")}
                </div>
            </div>
        </form>
    `);

    modalFooter.insertAdjacentHTML("afterbegin", `
        <button type="button" class="btn-auth-link" id="show-register-form">Create account</button>
        <button type="button" class="btn-auth-link" id="show-login-form" hidden>Back to login</button>
    `);

    modalFooter.insertAdjacentHTML("beforeend", `
        <button type="submit" form="register-form" class="btn-register" id="register-submit-btn" hidden>Register</button>
    `);
}

function initChangePasswordMarkup() {
    const dropdownList = document.querySelector(".user-dropdown-list");
    const logoutButton = document.getElementById("logout-btn");

    if (dropdownList && !document.getElementById("change-password-open-btn")) {
        const changePasswordItem = document.createElement("li");
        changePasswordItem.innerHTML = `
            <button type="button" class="btn-profile-action" id="change-password-open-btn">Change password</button>
        `;

        const logoutItem = logoutButton?.closest("li");

        if (logoutItem) {
            dropdownList.insertBefore(changePasswordItem, logoutItem);
        } else {
            dropdownList.appendChild(changePasswordItem);
        }
    }

    if (document.getElementById("change-password-modal")) {
        return;
    }

    document.body.insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="change-password-modal" aria-hidden="true" style="display: none;">
            <div class="modal-window" role="dialog" aria-labelledby="change-password-title" aria-modal="true">
                <div class="modal-header">
                    <h2 class="modal-title" id="change-password-title">Change password</h2>
                    <button class="btn-close" type="button" id="close-change-password-modal" aria-label="Close modal">&times;</button>
                </div>

                <div class="modal-body">
                    <form id="change-password-form">
                        <div class="form-group">
                            <label for="current-password">Current</label>
                            <div class="password-wrapper">
                                <input type="password" id="current-password" class="form-control" required>
                                ${getPasswordToggleButton("current-password")}
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="new-password">New</label>
                            <div class="password-wrapper">
                                <input type="password" id="new-password" class="form-control" required>
                                ${getPasswordToggleButton("new-password")}
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="confirm-new-password">Confirm</label>
                            <div class="password-wrapper">
                                <input type="password" id="confirm-new-password" class="form-control" required>
                                ${getPasswordToggleButton("confirm-new-password")}
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-cancel" id="cancel-change-password">Cancel</button>
                    <button type="submit" form="change-password-form" class="btn-save-password">Save</button>
                </div>
            </div>
        </div>
    `);
}

function showLoginForm() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const modalTitle = document.querySelector("#login-modal .modal-title");
    const loginSubmitButton = document.querySelector("#login-modal .btn-login");
    const registerSubmitButton = document.getElementById("register-submit-btn");
    const showRegisterButton = document.getElementById("show-register-form");
    const showLoginButton = document.getElementById("show-login-form");

    if (modalTitle) modalTitle.textContent = "Authentication";
    if (loginForm) loginForm.hidden = false;
    if (registerForm) registerForm.hidden = true;
    if (loginSubmitButton) loginSubmitButton.hidden = false;
    if (registerSubmitButton) registerSubmitButton.hidden = true;
    if (showRegisterButton) showRegisterButton.hidden = false;
    if (showLoginButton) showLoginButton.hidden = true;
}

function showRegisterForm() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const modalTitle = document.querySelector("#login-modal .modal-title");
    const loginSubmitButton = document.querySelector("#login-modal .btn-login");
    const registerSubmitButton = document.getElementById("register-submit-btn");
    const showRegisterButton = document.getElementById("show-register-form");
    const showLoginButton = document.getElementById("show-login-form");

    if (modalTitle) modalTitle.textContent = "Register";
    if (loginForm) loginForm.hidden = true;
    if (registerForm) registerForm.hidden = false;
    if (loginSubmitButton) loginSubmitButton.hidden = true;
    if (registerSubmitButton) registerSubmitButton.hidden = false;
    if (showRegisterButton) showRegisterButton.hidden = true;
    if (showLoginButton) showLoginButton.hidden = false;
}

function openChangePasswordModal() {
    const modal = document.getElementById("change-password-modal");
    const form = document.getElementById("change-password-form");

    if (!modal) {
        return;
    }

    form?.reset();
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function closeChangePasswordModal() {
    const modal = document.getElementById("change-password-modal");

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
    const password = document.getElementById("login-password")?.value || "";

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

async function handleRegisterSubmit(event) {
    event.preventDefault();

    const password = document.getElementById("register-password")?.value || "";
    const confirmPassword = document.getElementById("register-confirm-password")?.value || "";

    if (!password) {
        alert("Enter password");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    const studentData = {
        group: document.getElementById("register-group")?.value,
        firstName: document.getElementById("register-first-name")?.value.trim(),
        lastName: document.getElementById("register-last-name")?.value.trim(),
        gender: document.getElementById("register-gender")?.value,
        birthday: document.getElementById("register-birthday")?.value,
        password
    };

    const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(studentData)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        if (data.errors) {
            alert(Object.values(data.errors).join("\n"));
            return;
        }

        alert(data.message || "Registration failed");
        return;
    }

    event.target.reset();

    const loginUsername = document.getElementById("login-username");

    if (loginUsername) {
        loginUsername.value = `${studentData.firstName} ${studentData.lastName}`.trim();
    }

    showLoginForm();
    alert("Account created. You can log in now.");
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();

    const currentPassword = document.getElementById("current-password")?.value || "";
    const newPassword = document.getElementById("new-password")?.value || "";
    const confirmPassword = document.getElementById("confirm-new-password")?.value || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Fill in all password fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password and confirmation do not match.");
        return;
    }

    const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || "Password change failed.");
        return;
    }

    event.target.reset();
    closeChangePasswordModal();
    alert(data.message || "Password changed successfully.");
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
    initRegisterFormMarkup();
    initChangePasswordMarkup();
    updateAuthUI();

    const loginOpenButton = document.getElementById("login-open-btn");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const changePasswordForm = document.getElementById("change-password-form");
    const logoutButton = document.getElementById("logout-btn");
    const showRegisterButton = document.getElementById("show-register-form");
    const showLoginButton = document.getElementById("show-login-form");
    const changePasswordOpenButton = document.getElementById("change-password-open-btn");

    const closeLoginButton = document.getElementById("close-login-modal");
    const cancelLoginButton = document.getElementById("cancel-login");
    const closeChangePasswordButton = document.getElementById("close-change-password-modal");
    const cancelChangePasswordButton = document.getElementById("cancel-change-password");

    if (loginOpenButton) {
        loginOpenButton.addEventListener("click", openLoginModal);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegisterSubmit);
    }

    if (showRegisterButton) {
        showRegisterButton.addEventListener("click", showRegisterForm);
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", showLoginForm);
    }

    if (changePasswordOpenButton) {
        changePasswordOpenButton.addEventListener("click", openChangePasswordModal);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", handleChangePasswordSubmit);
    }

    if (closeChangePasswordButton) {
        closeChangePasswordButton.addEventListener("click", closeChangePasswordModal);
    }

    if (cancelChangePasswordButton) {
        cancelChangePasswordButton.addEventListener("click", closeChangePasswordModal);
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
