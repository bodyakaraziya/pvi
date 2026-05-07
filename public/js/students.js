let currentPage = 1;
let studentToDeleteId = null;
let currentUser = null;

const PAGE_LIMIT = 5;

// Екрануємо дані студентів перед вставкою в HTML-таблицю.
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    const [year, month, day] = dateValue.split("-");

    if (!year || !month || !day) {
        return dateValue;
    }

    return `${day}.${month}.${year}`;
}

async function ensureAuth() {
    // Для приватних дій відкриваємо login-modal замість тихого падіння API-запиту.
    currentUser = await getCurrentUser();

    if (!currentUser) {
        openLoginModal();
        return false;
    }

    return true;
}

function updateStudentStatusInTable(userId, status) {
    // Realtime-статус приходить із socket і точково оновлює рядок таблиці.
    const statusDot = document.querySelector(`[data-student-status-id="${CSS.escape(String(userId))}"]`);

    if (!statusDot) {
        return;
    }

    const isOnline = String(status || "").toLowerCase() === "online";

    statusDot.classList.remove("status--online", "status--offline");
    statusDot.classList.add(isOnline ? "status--online" : "status--offline");
    statusDot.title = isOnline ? "Online" : "Offline";
    statusDot.setAttribute("aria-label", isOnline ? "Online" : "Offline");
}

async function loadStudents(page = 1) {
    // Таблиця завантажує тільки одну сторінку, щоб pagination залишався швидким.
    currentPage = page;

    const response = await fetch(`/api/students?page=${page}&limit=${PAGE_LIMIT}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || "Не вдалося завантажити студентів");
        return;
    }

    renderStudents(data.students);
    renderPagination(data.currentPage, data.totalPages);
}

function renderStudents(students) {
    // Розмітка таблиці створюється з безпечних DTO без паролів.
    const tableBody = document.getElementById("students-table-body");

    if (!tableBody) {
        return;
    }

    if (!students.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">Студентів немає</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = students.map(student => {
        const isOnline = String(student.status || "").toLowerCase() === "online";
        const statusLabel = isOnline ? "Online" : "Offline";

        return `
        <tr data-id="${escapeHtml(student.id)}">
            <td>
                <input 
                    type="checkbox" 
                    class="student-checkbox" 
                    data-id="${escapeHtml(student.id)}"
                    aria-label="Select student"
                >
            </td>
            <td>${escapeHtml(student.group)}</td>
            <td>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</td>
            <td>${escapeHtml(student.gender)}</td>
            <td>${escapeHtml(formatDate(student.birthday))}</td>
            <td>
                <span
                    class="student-status-dot ${isOnline ? "status--online" : "status--offline"}"
                    data-student-status-id="${escapeHtml(student.id)}"
                    title="${statusLabel}"
                    aria-label="${statusLabel}"
                ></span>
            </td>
            <td>
                <button 
                    type="button" 
                    class="btn-edit" 
                    data-action="edit" 
                    data-id="${escapeHtml(student.id)}"
                    aria-label="Edit student"
                >
                    ✎
                </button>

                <button 
                    type="button" 
                    class="btn-delete" 
                    data-action="delete" 
                    data-id="${escapeHtml(student.id)}"
                    data-name="${escapeHtml(`${student.firstName} ${student.lastName}`)}"
                    aria-label="Delete student"
                >
                    ×
                </button>
            </td>
        </tr>
    `;
    }).join("");
}

function renderPagination(current, total) {
    const container = document.getElementById("pagination-container");

    if (!container) {
        return;
    }

    let html = "";

    for (let page = 1; page <= total; page++) {
        html += `
            <button 
                type="button"
                class="page-btn ${page === current ? "active" : ""}"
                data-page="${page}"
            >
                ${page}
            </button>
        `;
    }

    container.innerHTML = html;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) {
        return;
    }

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    if (!modal) {
        return;
    }

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

async function openAddModal() {
    // Перед створенням студента перевіряємо логін і готуємо форму в режимі create.
    const isAuth = await ensureAuth();

    if (!isAuth) {
        return;
    }

    const form = document.getElementById("add-student-form");
    const studentIdInput = document.getElementById("student-id");
    const modalTitle = document.getElementById("add-modal-title");
    const submitButton = document.querySelector(".btn-create");

    form?.reset();

    if (studentIdInput) {
        studentIdInput.value = "";
    }

    if (modalTitle) {
        modalTitle.textContent = "Add student";
    }

    if (submitButton) {
        submitButton.textContent = "Create";
        submitButton.dataset.mode = "create";
    }

    openModal("add-modal");
}

function closeAddModal() {
    closeModal("add-modal");
}

async function openEditModal(studentId) {
    // Для редагування спочатку підтягуємо актуальні дані студента з API.
    const isAuth = await ensureAuth();

    if (!isAuth) {
        return;
    }

    const response = await fetch(`/api/students/${studentId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || "Студента не знайдено");
        return;
    }

    const student = data.student;

    document.getElementById("student-id").value = student.id;
    document.getElementById("group").value = student.group;
    document.getElementById("first-name").value = student.firstName;
    document.getElementById("last-name").value = student.lastName;
    document.getElementById("gender").value = student.gender;
    document.getElementById("birthday").value = student.birthday;

    const modalTitle = document.getElementById("add-modal-title");
    const submitButton = document.querySelector(".btn-create");

    if (modalTitle) {
        modalTitle.textContent = "Edit student";
    }

    if (submitButton) {
        submitButton.textContent = "Save";
        submitButton.dataset.mode = "edit";
    }

    openModal("add-modal");
}

async function handleStudentFormSubmit(event) {
    // Одна форма працює і на створення, і на редагування залежно від data-mode кнопки.
    event.preventDefault();

    const isAuth = await ensureAuth();

    if (!isAuth) {
        return;
    }

    const studentId = document.getElementById("student-id").value;
    const submitButton = document.querySelector(".btn-create");
    const mode = submitButton?.dataset.mode || "create";

    const studentData = {
        group: document.getElementById("group").value,
        firstName: document.getElementById("first-name").value.trim(),
        lastName: document.getElementById("last-name").value.trim(),
        gender: document.getElementById("gender").value,
        birthday: document.getElementById("birthday").value
    };

    const url = mode === "edit"
        ? `/api/students/${studentId}`
        : "/api/students";

    const method = mode === "edit" ? "PUT" : "POST";

    const response = await fetch(url, {
        method,
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

        alert(data.message || "Помилка збереження");
        return;
    }

    closeAddModal();
    await loadStudents(currentPage);
}

async function openDeleteModal(studentId, studentName) {
    // ID зберігаємо окремо, щоб confirm-кнопка знала, кого видаляти.
    const isAuth = await ensureAuth();

    if (!isAuth) {
        return;
    }

    studentToDeleteId = studentId;

    const nameElement = document.getElementById("delete-user-name");

    if (nameElement) {
        nameElement.textContent = studentName;
    }

    openModal("delete-modal");
}

function closeDeleteModal() {
    studentToDeleteId = null;
    closeModal("delete-modal");
}

async function confirmDeleteStudent() {
    if (!studentToDeleteId) {
        return;
    }

    const response = await fetch(`/api/students/${studentToDeleteId}`, {
        method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || "Помилка видалення");
        return;
    }

    closeDeleteModal();
    await loadStudents(currentPage);
}

async function confirmDeleteAll() {
    // Масове видалення бере тільки вибрані checkbox-рядки.
    const isAuth = await ensureAuth();

    if (!isAuth) {
        return;
    }

    const selectedIds = [...document.querySelectorAll(".student-checkbox:checked")]
        .map(checkbox => checkbox.dataset.id);

    if (selectedIds.length === 0) {
        alert("Оберіть студентів для видалення");
        return;
    }

    const confirmed = confirm(`Видалити вибраних студентів: ${selectedIds.length}?`);

    if (!confirmed) {
        return;
    }

    const response = await fetch("/api/students/bulk-delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ids: selectedIds
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        alert("Помилка масового видалення");
        return;
    }

    await loadStudents(currentPage);
}

function initStudentsPage() {
    // Усі listeners сторінки реєструються в одному місці після готовності DOM.
    loadStudents();

    document.getElementById("add-student-btn")?.addEventListener("click", openAddModal);
    document.getElementById("delete-selected-btn")?.addEventListener("click", confirmDeleteAll);

    document.getElementById("add-student-form")?.addEventListener("submit", handleStudentFormSubmit);

    document.getElementById("close-add-modal")?.addEventListener("click", closeAddModal);
    document.getElementById("cancel-add")?.addEventListener("click", closeAddModal);

    document.getElementById("close-delete-modal")?.addEventListener("click", closeDeleteModal);
    document.getElementById("cancel-delete")?.addEventListener("click", closeDeleteModal);
    document.getElementById("confirm-delete")?.addEventListener("click", confirmDeleteStudent);

    document.getElementById("students-table-body")?.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const studentId = button.dataset.id;

        if (action === "edit") {
            openEditModal(studentId);
        }

        if (action === "delete") {
            openDeleteModal(studentId, button.dataset.name);
        }
    });

    document.getElementById("pagination-container")?.addEventListener("click", event => {
        const button = event.target.closest(".page-btn");

        if (!button) {
            return;
        }

        loadStudents(Number(button.dataset.page));
    });

    document.getElementById("select-all")?.addEventListener("change", event => {
        document.querySelectorAll(".student-checkbox").forEach(checkbox => {
            checkbox.checked = event.target.checked;
        });
    });
}

window.openAddModal = openAddModal;
window.confirmDeleteAll = confirmDeleteAll;

function refreshStudentsTable() {
    loadStudents(currentPage);
}

window.updateStudentStatusInTable = updateStudentStatusInTable;
window.refreshStudentsTable = refreshStudentsTable;

document.addEventListener("DOMContentLoaded", initStudentsPage);
