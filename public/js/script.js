// ==========================================
// 1. ІНІЦІАЛІЗАЦІЯ ТА РОУТИНГ
// ==========================================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
}

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Перевірка, чи треба відкрити логін модалку
    if (urlParams.has('auth_required')) {
        openLoginModal();
        // Очищаємо URL від зайвих параметрів без перезавантаження сторінки
        const cleanUrl = window.location.pathname + "?page=" + (urlParams.get('page') || 'student');
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Запускаємо завантаження даних
    loadStudentsFromServer(1);
});


// ==========================================
// 2. ІНТЕРФЕЙС ТА НАВІГАЦІЯ (Дзвіночок, Сайдбар)
// ==========================================
const iconBell = document.querySelector(".bell-icon");
const notificationIndicator = document.querySelector(".notification-indicator");
let timerNotification = null;

if (localStorage.getItem("newNotification") === "true" && notificationIndicator) {
    notificationIndicator.style.display = "block";
}

if (iconBell) {
    iconBell.addEventListener("click", () => {
        if (timerNotification) return;
        timerNotification = setTimeout(() => {
            window.location.href = "index.php?page=message"; 
            localStorage.setItem("newNotification", "false");
            timerNotification = null; 
        }, 300); 
    });

    iconBell.addEventListener("dblclick", () => {
        if (timerNotification) {
            clearTimeout(timerNotification); 
            timerNotification = null;
        }
        iconBell.classList.toggle("ringing");
        setTimeout(() => {
            iconBell.classList.remove("ringing");
            if (notificationIndicator) notificationIndicator.style.display = "block";
            localStorage.setItem("newNotification", "true");
        }, 1500);
    });
}

const btnBurger = document.querySelector(".burger");
const panelSidebar = document.querySelector(".sidebar");
const areasClickable = document.querySelectorAll(".main-container, .main-header");

if (btnBurger && panelSidebar) {
    btnBurger.addEventListener("click", (e) => {
        e.stopPropagation(); 
        panelSidebar.classList.toggle("active");
    });
    areasClickable.forEach(area => {
        area.addEventListener("click", () => panelSidebar.classList.remove("active"));
    });
    panelSidebar.addEventListener("click", (e) => e.stopPropagation());
}


// ==========================================
// 3. РОБОТА З ТАБЛИЦЕЮ ТА ДАНИМИ (AJAX)
// ==========================================
const tableBodyStudents = document.getElementById("students-table-body");
const checkboxSelectAll = document.querySelector("#select-all");
const btnDeleteSelected = document.querySelector(".btn-delete-all"); 
const labelUserName = document.querySelector(".user-name");

function loadStudentsFromServer(page = 1) { 
    fetch(`index.php?action=get_students&p=${page}`) 
        .then(response => response.json())
        .then(data => {
            const { isLoggedIn, students, totalPages, currentPage } = data;
            
            if (!tableBodyStudents) return;
            tableBodyStudents.innerHTML = ''; 

            // Скидаємо стан чекбокса і ховаємо кнопку видалення
            if (checkboxSelectAll) checkboxSelectAll.checked = false;
            if (btnDeleteSelected) btnDeleteSelected.style.display = "none";

            if (students.length === 0) {
                tableBodyStudents.innerHTML = '<tr><td colspan="7">Студентів не знайдено</td></tr>';
                renderPagination(0, 1);
                return;
            }

            students.forEach(student => {
                const tr = document.createElement("tr");
                tr.dataset.id = student.id;

                const editAction = isLoggedIn ? `openEditModal(${student.id})` : `openLoginModal()`;
                const deleteAction = isLoggedIn ? `confirmDelete(${student.id}, '${student.firstname} ${student.lastname}')` : `openLoginModal()`;
                
                tr.innerHTML = `
                    <td><input type="checkbox" class="select-student"></td>
                    <td>${student.group}</td>
                    <td>${student.firstname} ${student.lastname}</td>
                    <td>${student.gender}</td>
                    <td>${convertDateToTableFormat(student.birthday)}</td>
                    <td><span class="status status--offline"></span></td>
                    <td>
                        <button class="btn-edit" onclick="${editAction}">
                           <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="edit-icon" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" /></svg>
                        </button>
                        <button class="btn-delete" onclick="${deleteAction}">
                           <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="delete-icon" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" /></svg>
                        </button>
                    </td>
                `;
                tableBodyStudents.appendChild(tr);
            });

            updateOnlineStatuses();
            renderPagination(totalPages, currentPage);
        })
        .catch(error => console.error('Помилка завантаження студентів:', error));
}

function renderPagination(totalPages, currentPage) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = ''; 

    if (totalPages <= 1) return; 

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadStudentsFromServer(currentPage - 1);
    paginationContainer.appendChild(prevBtn);

    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        }
    }

    let paginationWithDots = [];
    let lastAddedPage;
    
    for (let page of pages) {
        if (lastAddedPage) {
            if (page - lastAddedPage === 2) paginationWithDots.push(lastAddedPage + 1); 
            else if (page - lastAddedPage !== 1) paginationWithDots.push('...'); 
        }
        paginationWithDots.push(page);
        lastAddedPage = page;
    }

    for (let item of paginationWithDots) {
        const pageBtn = document.createElement('button');
        if (item === '...') {
            pageBtn.className = 'page-btn dots';
            pageBtn.textContent = '...';
            pageBtn.disabled = true; 
        } else {
            pageBtn.className = `page-btn ${item === currentPage ? 'active' : ''}`;
            pageBtn.textContent = item;
            pageBtn.onclick = () => loadStudentsFromServer(item);
        }
        paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = currentPage === totalPages; 
    nextBtn.onclick = () => loadStudentsFromServer(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}


// ==========================================
// 4. МОДАЛЬНІ ВІКНА ТА ФОРМИ СТУДЕНТА
// ==========================================
const modalStudent = document.getElementById("add-modal");
const titleModalStudent = modalStudent?.querySelector(".modal-title");
const btnSaveStudent = modalStudent?.querySelector(".btn-create");
const formStudent = document.getElementById("add-student-form");

const inputStudentId = document.getElementById("student-id");
const inputGroup = document.getElementById("group");
const inputFirstName = document.getElementById("first-name");
const inputLastName = document.getElementById("last-name");
const selectGender = document.getElementById("gender");
const inputBirthday = document.getElementById("birthday");
const allFormInputs = [inputGroup, inputFirstName, inputLastName, selectGender, inputBirthday];

window.validationMode = "js"; // "html", "js" або "regex"

function openModal(modal) { if(modal) modal.style.display = "flex"; }
function closeModal(modal) { if(modal) modal.style.display = "none"; }

function openAddModal() {
    clearStudentForm();
    if (titleModalStudent) titleModalStudent.textContent = "Add student";
    if (btnSaveStudent) {
        btnSaveStudent.textContent = "Create";
        btnSaveStudent.dataset.mode = "create";
    }
    openModal(modalStudent);
}

function openEditModal(studentId) {
    const row = document.querySelector(`tr[data-id="${studentId}"]`);
    if (!row) return;

    inputStudentId.value = row.dataset.id;
    inputGroup.value = row.cells[1].textContent.trim(); 
    
    const { firstName, lastName } = splitFullName(row.cells[2].textContent);
    inputFirstName.value = firstName;
    inputLastName.value = lastName;
    
    selectGender.value = row.cells[3].textContent.trim();
    inputBirthday.value = convertDateToInputFormat(row.cells[4].textContent.trim());

    if (titleModalStudent) titleModalStudent.textContent = "Edit student";
    if (btnSaveStudent) {
        btnSaveStudent.textContent = "Save";
        btnSaveStudent.dataset.mode = "edit";
    }
    openModal(modalStudent);
}

function closeStudentModal() {
    closeModal(modalStudent);
    clearStudentForm();
}

function clearStudentForm() {
    if (inputStudentId) inputStudentId.value = "";
    allFormInputs.forEach(input => {
        if (input) {
            input.value = "";
            input.classList.remove("error");
        }
    });
}

allFormInputs.forEach(input => {
    if (input) {
        input.addEventListener("input", () => input.classList.remove("error"));
        input.addEventListener("change", () => input.classList.remove("error"));
    }
});

// Слухачі для закриття модалки
document.getElementById("close-add-modal")?.addEventListener("click", closeStudentModal);
document.getElementById("cancel-add")?.addEventListener("click", closeStudentModal);

// Обробка збереження
if (btnSaveStudent) {
    btnSaveStudent.addEventListener("click", (e) => {
        if (window.validationMode !== "html") e.preventDefault();
        if (!validateForm()) return;

        const studentData = {
            id: inputStudentId.value,
            group: inputGroup.value.trim(),
            firstName: inputFirstName.value.trim(),
            lastName: inputLastName.value.trim(),
            gender: selectGender.value,
            birthday: inputBirthday.value
        };

        const actionUrl = btnSaveStudent.dataset.mode === "create" ? "index.php?action=add" : "index.php?action=edit";

        fetch(actionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeStudentModal();
                loadStudentsFromServer(1); // Єдине джерело правди - запит на сервер!
            } else {
                if (data.errors) {
                    alert("Помилки перевірки на сервері:\n\n" + Object.values(data.errors).map(e => `— ${e}`).join("\n"));
                } else {
                    alert("Помилка: " + (data.message || "Невідома помилка"));
                }
            }
        })
        .catch(error => console.error('Помилка:', error));
    });
}

function validateForm() {
    if (window.validationMode === "html") {
        formStudent.removeAttribute("novalidate");
        return formStudent.checkValidity(); 
    }

    formStudent.setAttribute("novalidate", "true");
    let isValid = true;
    allFormInputs.forEach(input => input.classList.remove("error"));

    const groupVal = inputGroup.value.trim();
    const firstNameVal = inputFirstName.value.trim();
    const lastNameVal = inputLastName.value.trim();
    const genderVal = selectGender.value;
    const birthdayVal = inputBirthday.value;

    if (!groupVal) { isValid = false; inputGroup.classList.add("error"); }
    if (!genderVal) { isValid = false; selectGender.classList.add("error"); }
    if (!firstNameVal) { isValid = false; inputFirstName.classList.add("error"); }
    if (!lastNameVal) { isValid = false; inputLastName.classList.add("error"); }
    if (!birthdayVal) { isValid = false; inputBirthday.classList.add("error"); }

    const nameReg = /^[A-Za-zА-Яа-яЇїЄєІіҐґ]([A-Za-zА-Яа-яЇїЄєІіҐґ\'’\-]*[A-Za-zА-Яа-яЇїЄєІіҐґ])?$/;
    const dateReg = /^(19[5-9]\d|200\d|2010)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // Спрощено для 1950-2010

    if (window.validationMode === "js" || window.validationMode === "regex") {
        if (firstNameVal && !nameReg.test(firstNameVal)) { isValid = false; inputFirstName.classList.add("error"); }
        if (lastNameVal && !nameReg.test(lastNameVal)) { isValid = false; inputLastName.classList.add("error"); }
        
        if (window.validationMode === "regex") {
            if (birthdayVal && !dateReg.test(birthdayVal)) { isValid = false; inputBirthday.classList.add("error"); }
        } else { // Для JS режиму
            if (birthdayVal) {
                const year = new Date(birthdayVal).getFullYear();
                if (isNaN(year) || year > 2010 || year < 1950) {
                    isValid = false;
                    inputBirthday.classList.add("error");
                }
            }
        }
    }
    return isValid;
}


// ==========================================
// 5. ЛОГІКА ВИДАЛЕННЯ СТУДЕНТІВ
// ==========================================
const modalDelete = document.getElementById("delete-modal");        
const spanDeleteUserName = document.getElementById("delete-user-name");
let currentTargetToDelete = null;

function confirmDelete(studentId, studentName) {
    currentTargetToDelete = studentId; 
    if (spanDeleteUserName) spanDeleteUserName.textContent = studentName || "this student";
    openModal(modalDelete);
}

function confirmDeleteAll() {
    currentTargetToDelete = 'all'; 
    if (spanDeleteUserName) spanDeleteUserName.textContent = "all selected users";
    openModal(modalDelete);
}

function closeDeleteModal() {
    currentTargetToDelete = null; 
    closeModal(modalDelete);
}

document.getElementById("cancel-delete")?.addEventListener("click", closeDeleteModal);
document.getElementById("close-delete-modal")?.addEventListener("click", closeDeleteModal);

document.getElementById("confirm-delete")?.addEventListener("click", () => {
    if (currentTargetToDelete !== null && currentTargetToDelete !== 'all') {
        executeDelete('index.php?action=delete', { id: currentTargetToDelete });
    } else if (currentTargetToDelete === 'all') {
        const allChecked = document.querySelectorAll(".select-student:checked");
        const idsToDelete = Array.from(allChecked).map(cb => cb.closest("tr").dataset.id);
        if (idsToDelete.length === 0) return closeDeleteModal();
        
        executeDelete('index.php?action=deleteMultiple', { ids: idsToDelete });
    }
});

function executeDelete(url, bodyData) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadStudentsFromServer(1); 
            closeDeleteModal();
        } else {
            alert("Помилка: " + (data.message || "Не вдалося видалити"));
        }
    })
    .catch(err => console.error('Помилка видалення:', err));
}

if (tableBodyStudents) {
    tableBodyStudents.addEventListener("change", (e) => {
        if (e.target.classList.contains("select-student")) updateDeleteButtonVisibility();
    });
}

if (checkboxSelectAll) {
    checkboxSelectAll.addEventListener("change", () => {
        document.querySelectorAll(".select-student").forEach(cb => cb.checked = checkboxSelectAll.checked);
        updateDeleteButtonVisibility();
    });
}

function updateDeleteButtonVisibility() {
    const allCheckboxes = document.querySelectorAll(".select-student");
    const anyChecked = Array.from(allCheckboxes).some(c => c.checked);
    const allChecked = Array.from(allCheckboxes).every(c => c.checked) && allCheckboxes.length > 0;

    if (btnDeleteSelected) btnDeleteSelected.style.display = anyChecked ? "block" : "none";
    if (checkboxSelectAll) checkboxSelectAll.checked = allChecked;
}


// ==========================================
// 6. УТИЛІТИ ТА ДОПОМІЖНІ ФУНКЦІЇ
// ==========================================
function updateOnlineStatuses() {
    const rows = document.querySelectorAll(".students-table tbody tr");
    if (!labelUserName || rows.length === 0) return;

    const currentUserName = labelUserName.textContent.trim();
    rows.forEach(row => {
        const nameCell = row.cells[2];
        if (!nameCell) return;

        const statusIndicator = row.querySelector(".status");
        if (statusIndicator) {
            const isOnline = currentUserName === nameCell.textContent.trim();
            statusIndicator.classList.toggle("status--online", isOnline);
            statusIndicator.classList.toggle("status--offline", !isOnline);
        }
    });
}

function convertDateToInputFormat(dateStr) {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month}-${day}`;
}

function convertDateToTableFormat(dateStr) {
    if (!dateStr) return "";
    if (dateStr.includes(".")) return dateStr;
    if (dateStr.includes("-")) {
        const [year, month, day] = dateStr.split("-");
        return `${day}.${month}.${year}`;
    }
    return dateStr; 
}

function splitFullName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    return { firstName: parts[0] || "", lastName: parts[1] || "" };
}


// ==========================================
// 7. МОДАЛЬНЕ ВІКНО ЛОГІНУ
// ==========================================
const loginModal = document.getElementById('login-modal');

function openLoginModal() { if (loginModal) loginModal.style.display = 'flex'; }
function closeLoginModal() { if (loginModal) loginModal.style.display = 'none'; }

window.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
});

function togglePasswordVisibility(inputId, buttonElement) {
    const passwordInput = document.getElementById(inputId);
    const eyeOpen = buttonElement.querySelector('.eye-open');
    const eyeClosed = buttonElement.querySelector('.eye-closed');
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        passwordInput.type = "password";
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
}


// ==========================================
// 8. ГЕНЕРАТОР ТЕСТОВИХ ДАНИХ (SEEDER)
// ==========================================
window.addRandomStudent = function() {
    const maleNames = ['Bohdan', 'Ivan', 'Petro', 'Mykola', 'Oleksandr', 'Dmytro', 'Andriy', 'Taras'];
    const femaleNames = ['Daryna', 'Anna', 'Maria', 'Olena', 'Iryna', 'Kateryna', 'Sofia', 'Yulia'];
    const lastNames = ['Karaziia', 'Baranova', 'Shevchenko', 'Kovalenko', 'Boyko', 'Tkachenko', 'Melnyk', 'Kravchenko'];
    const groups = ['PZ-21', 'PZ-22', 'PZ-23', 'PZ-24', 'PZ-25', 'PZ-26'];
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const firstName = gender === 'M' ? getRandom(maleNames) : getRandom(femaleNames);
    
    const startTime = new Date(1950, 0, 1).getTime();
    const endTime = new Date(2010, 11, 31).getTime();
    const birthday = new Date(startTime + Math.random() * (endTime - startTime)).toISOString().split('T')[0];

    return fetch("index.php?action=add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "", group: getRandom(groups), firstName, lastName: getRandom(lastNames), gender, birthday })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log(`✅ Додано! ID: ${data.newId}`);
            if (typeof loadStudentsFromServer === "function") loadStudentsFromServer(1); 
        } else {
            console.error("❌ Помилка сервера:", data.errors || data.message);
        }
    })
    .catch(err => console.error("Помилка мережі:", err));
};

window.seedStudents = async function(count = 5) {
    console.log(`Генерація ${count} студентів...`);
    for (let i = 0; i < count; i++) await window.addRandomStudent();
    console.log("Завершено!");
};