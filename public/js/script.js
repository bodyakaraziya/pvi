if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
}

// ==========================================
// Дзвіночок
// ==========================================

const iconBell = document.querySelector(".bell-icon");
const notificationIndicator = document.querySelector(".notification-indicator");
let timerNotification = null;

if (localStorage.getItem("newNotification") === "true") {
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
            notificationIndicator.style.display = "block";
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
        area.addEventListener("click", () => {
            panelSidebar.classList.remove("active");
        });
    });

    panelSidebar.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}


// ==========================================
// Сторінка студентів
// ==========================================

const tableBodyStudents = document.getElementById("students-table-body");

// if (tableBodyStudents) 

const btnAddStudent = document.querySelector(".btn-add");
const checkboxSelectAll = document.querySelector("#select-all");
const labelUserName = document.querySelector(".user-name");

// Елементи модального вікна "Додавання / Редагування"
const modalStudent = document.getElementById("add-modal");
const titleModalStudent = modalStudent?.querySelector(".modal-title");
const btnSaveStudent = modalStudent?.querySelector(".btn-create");
const btnCloseStudentModal = modalStudent?.querySelector(".btn-close");
const btnCancelStudentModal = modalStudent?.querySelector(".btn-cancel");

// Елементи форми
window.validationMode = "js"; // "html", "js" або "regex"
const formStudent = document.getElementById("add-student-form");
const inputStudentId = document.getElementById("student-id");
const inputGroup = document.getElementById("group");
const inputFirstName = document.getElementById("first-name");
const inputLastName = document.getElementById("last-name");
const selectGender = document.getElementById("gender");
const inputBirthday = document.getElementById("birthday");

// Елементи модального вікна видалення
// Елементи модального вікна видалення
const btnDeleteSelected = document.querySelector(".btn-delete-all"); 
const modalDelete = document.getElementById("delete-modal");         
const spanDeleteUserName = document.getElementById("delete-user-name");
const btnConfirmDelete = document.getElementById("confirm-delete");
const btnCancelDelete = document.getElementById("cancel-delete");
const btnCloseDeleteModal = document.getElementById("close-delete-modal");

let nextStudentId = 4; // Лічильник для нових записів

const allFormInputs = [inputGroup, inputFirstName, inputLastName, selectGender, inputBirthday];

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
    input.addEventListener("input", () => input.classList.remove("error"));
    input.addEventListener("change", () => input.classList.remove("error"));
});

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

    // Додаткові перевірки залежно від обраного режиму
    if (window.validationMode === "js") {
        const isValidName = (str) => {
            const allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZабвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ-'";
            for (let i = 0; i < str.length; i++) {
                if (!allowed.includes(str[i])) return false;
            }
            return true;
        };

        if (firstNameVal && (firstNameVal.length < 2 || !isValidName(firstNameVal))) { 
            isValid = false; 
            inputFirstName.classList.add("error"); 
        }
        if (lastNameVal && (lastNameVal.length < 2 || !isValidName(lastNameVal))) { 
            isValid = false; 
            inputLastName.classList.add("error"); 
        }
        if (birthdayVal) {
            // Якщо поле містить дату у форматі DD.MM.YYYY, 
            // її треба спершу прогнати через твою функцію convertDateToInputFormat
            const dateObj = new Date(birthdayVal);
            
            // Перевіряємо, чи розпізналась дата (відсіюємо Invalid Date)
            if (isNaN(dateObj.getTime())) {
                isValid = false;
                inputBirthday.classList.add("error");
            } else {
                const year = dateObj.getFullYear();
                // Згрупована перевірка діапазону років
                if (year > 2010 || year < 1950) {
                    isValid = false;
                    inputBirthday.classList.add("error");
                }
            }
        }
    } else if (window.validationMode === "regex") {
        const nameReg = /^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$/;
        const dateReg = /^(19\d{2}|200\d|2010)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

        if (firstNameVal && !nameReg.test(firstNameVal)) { isValid = false; inputFirstName.classList.add("error"); }
        if (lastNameVal && !nameReg.test(lastNameVal)) { isValid = false; inputLastName.classList.add("error"); }
        if (birthdayVal && !dateReg.test(birthdayVal)) { isValid = false; inputBirthday.classList.add("error"); }
    }

    return isValid;
}

function openModal(modal) {
    modal.style.display = "flex";
}

function closeModal(modal) {
    modal.style.display = "none";
}

function convertDateToInputFormat(dateStr) {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month}-${day}`;
}

function convertDateToTableFormat(dateStr) {
    if (!dateStr) return "";
    
    // Якщо дата вже відформатована через крапку (як у стартовому масиві з PHP)
    if (dateStr.includes(".")) {
        return dateStr;
    }
    
    // Якщо дата у форматі YYYY-MM-DD (з інпуту або генератора)
    if (dateStr.includes("-")) {
        const [year, month, day] = dateStr.split("-");
        return `${day}.${month}.${year}`;
    }
    
    return dateStr; // Про всяк випадок повертаємо як є, якщо формат невідомий
}

// Робота з ПІБ
function splitFullName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    return {
        firstName: parts[0] || "",
        lastName: parts[1] || ""
    };
}

// Оновлення видимості кнопки "Видалити вибраних"
function updateDeleteButtonVisibility() {
    const allCheckboxes = document.querySelectorAll(".select-student");
    const anyChecked = Array.from(allCheckboxes).some(c => c.checked);
    const allChecked = Array.from(allCheckboxes).every(c => c.checked) && allCheckboxes.length > 0;

    btnDeleteSelected.style.display = anyChecked ? "block" : "none";
    checkboxSelectAll.checked = allChecked;
}


// Встановлення статусів online-off
function updateOnlineStatuses() {
    const rows = document.querySelectorAll(".students-table tbody tr");
    if (!labelUserName || rows.length === 0) return;

    const currentUserName = labelUserName.textContent.trim();

    rows.forEach(row => {
        const nameCell = row.cells[2];
        if (!nameCell) return;

        const studentName = nameCell.textContent.trim();
        const statusIndicator = row.querySelector(".status");
        
        if (statusIndicator) {
            const isOnline = currentUserName === studentName;
            statusIndicator.classList.toggle("status--online", isOnline);
            statusIndicator.classList.toggle("status--offline", !isOnline);
        }
    });
}

updateOnlineStatuses();

function openEditModal(studentId) {
    const row = document.querySelector(`tr[data-id="${studentId}"]`);
    
    inputStudentId.value = row.dataset.id;

    const group = row.cells[1].textContent.trim();
    const fullName = row.cells[2].textContent.trim();
    const gender = row.cells[3].textContent.trim();
    const birthday = row.cells[4].textContent.trim();

    const { firstName, lastName } = splitFullName(fullName);

    inputGroup.value = group; 
    inputFirstName.value = firstName;
    inputLastName.value = lastName;
    selectGender.value = gender;
    inputBirthday.value = convertDateToInputFormat(birthday);

    titleModalStudent.textContent = "Edit student";
    btnSaveStudent.textContent = "Save";
    btnSaveStudent.dataset.mode = "edit";

    openModal(modalStudent);
} 

// Модальне вікно додавання/редагування
function openAddModal() {
    if (modalStudent) {
        clearStudentForm();
        titleModalStudent.textContent = "Add student";
        btnSaveStudent.textContent = "Create";
        btnSaveStudent.dataset.mode = "create";
        openModal(modalStudent);
    }
}

function closeStudentModal() {
    closeModal(modalStudent);
    clearStudentForm();
};

let currentTargetToDelete = null;

function confirmDelete(studentId, studentName) {
    currentTargetToDelete = studentId; // Запам'ятовуємо ID
    
    if (spanDeleteUserName) {
        spanDeleteUserName.textContent = studentName || "цього студента";
    }
    
    openModal(modalDelete);
}

function confirmDeleteAll() {
    currentTargetToDelete = 'all'; // Вказуємо, що видаляємо всіх обраних
    
    if (spanDeleteUserName) {
        spanDeleteUserName.textContent = "all selected users";
    }
    
    // Відкриваємо модалку (використовуй свою функцію відкриття)
    const modalDelete = document.getElementById('delete-modal');
    if (modalDelete) {
        modalDelete.style.display = 'flex'; // або openModal(modalDelete)
    }
}

// Функція закриття модалки
function closeDeleteModal() {
    currentTargetToDelete = null; // Очищаємо пам'ять при закритті
    closeModal(modalDelete);
}

// Клік по будь-якій частині таблиці, щоб для кожного рядка працювало
tableBodyStudents.addEventListener("click", function (e) {
    
    // Клік по чекбоксу студента
    if (e.target.classList.contains("select-student")) {
        updateDeleteButtonVisibility();
    }
});

// Клік по головному чекбоксу
if (checkboxSelectAll) {
    checkboxSelectAll.addEventListener("change", () => {
        const allCheckboxes = document.querySelectorAll(".select-student");
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = checkboxSelectAll.checked;
        });
        updateDeleteButtonVisibility();
    });
}

if (btnCloseStudentModal) btnCloseStudentModal.addEventListener("click", closeStudentModal);
if (btnCancelStudentModal) btnCancelStudentModal.addEventListener("click", closeStudentModal);

// Збереження форми
if (btnSaveStudent) {
    btnSaveStudent.addEventListener("click", (e) => {
        if (window.validationMode !== "html") {
            e.preventDefault();
        }

        if (!validateForm()) {
            return;
        }

        const id = inputStudentId.value;
        const mode = btnSaveStudent.dataset.mode;
        const groupVal = inputGroup.value.trim();
        const firstNameVal = inputFirstName.value.trim();
        const lastNameVal = inputLastName.value.trim();
        const genderVal = selectGender.value;
        const birthdayVal = inputBirthday.value;
        
        const fullName = [firstNameVal, lastNameVal].filter(Boolean).join(" ");

        // Збираємо дані для відправки
        const studentData = {
            id: id, // Якщо create, id буде порожнім
            group: groupVal,
            firstName: firstNameVal,
            lastName: lastNameVal,
            gender: genderVal,
            birthday: birthdayVal
        };

        // Визначаємо, куди слати запит
        const actionUrl = mode === "create" ? "index.php?action=add" : "index.php?action=edit";

        // Відправляємо на сервер
        fetch(actionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Якщо це режим додавання - малюємо новий рядок
                if (mode === "create") {
                    // 1. Перевіряємо, чи є в таблиці заглушка "Студентів не знайдено"
                    const emptyPlaceholder = tableBodyStudents.querySelector('td[colspan="7"]');
                    
                    if (emptyPlaceholder) {
                        emptyPlaceholder.closest('tr').remove();
                    }
                    
                    const newId = data.newId; 
                    const tr = document.createElement("tr");
                    tr.dataset.id = newId;
                    
                    const fullName = `${firstNameVal} ${lastNameVal}`;
                    const editAction = `openEditModal(${newId})`;
                    const deleteAction = `confirmDelete(${newId}, '${fullName}')`;

                    tr.innerHTML = `
                        <td><input type="checkbox" class="select-student"></td>
                        <td>${groupVal}</td>
                        <td>${fullName}</td>
                        <td>${genderVal}</td>
                        <td>${convertDateToTableFormat(birthdayVal)}</td>
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
                } else if (mode === "edit" && id) {
                    // Логіка оновлення існуючого рядка
                    const row = document.querySelector(`tr[data-id="${id}"]`);
                    if (row) {
                        row.cells[1].textContent = groupVal;
                        row.cells[2].textContent = `${firstNameVal} ${lastNameVal}`;
                        row.cells[3].textContent = genderVal;
                        row.cells[4].textContent = convertDateToTableFormat(birthdayVal);
                    }
                }

                closeStudentModal(); // Закриваємо модалку
                updateOnlineStatuses(); // Оновлюємо зелені кружечки

            } else {
                // Відображення помилок сервера
                if (data.errors) {
                    let errorMsg = "Помилки перевірки на сервері:\n\n";
                    for (const field in data.errors) {
                        errorMsg += `— ${data.errors[field]}\n`;
                    }
                    alert(errorMsg);
                } else {
                    alert("Помилка: " + (data.message || "Невідома помилка"));
                }
            }
        })
    });
}


if (btnCancelDelete) btnCancelDelete.addEventListener("click", closeDeleteModal);
if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener("click", closeDeleteModal);

if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", () => {
        if (currentTargetToDelete !== null && currentTargetToDelete !== 'all') {
            
            // 1. Відправляємо запит на наш бекенд
            fetch('index.php?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Кажемо PHP, що шлемо JSON
                },
                body: JSON.stringify({ id: currentTargetToDelete }) // Передаємо ID
            })
            .then(response => response.json()) // Чекаємо JSON-відповідь від PHP
            .then(data => {
                // 2. Перевіряємо, чи PHP сказав success: true
                if (data.success) {
                    loadStudentsFromServer(1); // Завантажить першу сторінку з правильним лімітом у 5 студентів
                    closeDeleteModal();

                    if (rowToRemove) {
                        rowToRemove.remove(); // Видаляємо з таблиці ТІЛЬКИ тепер
                        if (document.getElementById('students-table-body').children.length === 0) {
                            document.getElementById('students-table-body').innerHTML = '<tr><td colspan="7">Студентів не знайдено</td></tr>';
                        }
                    }
                } else {
                    alert("Помилка: " + data.message);
                }
            })
            .catch(error => {
                console.error('Помилка запиту:', error);
                alert("Сталася помилка зв'язку з сервером");
            });

        } else if (currentTargetToDelete === 'all') {
            // 1. Збираємо ID всіх відмічених студентів у масив
            const allChecked = document.querySelectorAll(".select-student:checked");
            const idsToDelete = Array.from(allChecked).map(checkbox => {
                return checkbox.closest("tr").dataset.id;
            });

            if (idsToDelete.length === 0) {
                closeDeleteModal();
                return;
            }

            // 2. Відправляємо масив ID на сервер
            fetch('index.php?action=deleteMultiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Викликаємо оновлення таблиці ОДИН раз (а не в циклі)
                    if (typeof loadStudentsFromServer === "function") {
                        loadStudentsFromServer(1);
                    }
                    closeDeleteModal();
                } else {
                    alert("Помилка: " + data.message);
                }
            })
            .catch(error => {
                console.error('Помилка запиту:', error);
                alert("Сталася помилка під час видалення");
            });
        }
    });
}





const loginModal = document.getElementById('login-modal');

function openLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'flex'; 
    }
}

function closeLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

window.addEventListener('click', function(event) {
    if (event.target === loginModal) {
        closeLoginModal();
    }
});

function togglePasswordVisibility(inputId, buttonElement) {
    const passwordInput = document.getElementById(inputId);
    
    const eyeOpenIcon = buttonElement.querySelector('.eye-open');
    const eyeClosedIcon = buttonElement.querySelector('.eye-closed');
    
    if (passwordInput.type === "password") {
        // Показуємо пароль
        passwordInput.type = "text";
        eyeOpenIcon.style.display = 'none';
        eyeClosedIcon.style.display = 'block';
    } else {
        // Ховаємо пароль
        passwordInput.type = "password";
        eyeOpenIcon.style.display = 'block';
        eyeClosedIcon.style.display = 'none';
    }
}


window.addEventListener('DOMContentLoaded', () => {
    // Створюємо об'єкт для роботи з параметрами URL
    const urlParams = new URLSearchParams(window.location.search);

    // Якщо в URL є параметр auth_required, викликаємо функцію відкриття модалки
    if (urlParams.has('auth_required')) {
        if (typeof openLoginModal === "function") {
            openLoginModal();
        }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth_required')) {
        if (typeof openLoginModal === "function") {
            openLoginModal();
        }
        // Магія: прибираємо параметр з URL без перезавантаження сторінки
        const cleanUrl = window.location.pathname + "?page=" + urlParams.get('page');
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Запускаємо завантаження даних
    loadStudentsFromServer();
});

// 1. Додали параметр page = 1
function loadStudentsFromServer(page = 1) { 
    // 2. Додали &p=${page} до URL запиту
    fetch(`index.php?action=get_students&p=${page}`) 
        .then(response => response.json())
        .then(data => {
            const isLoggedIn = data.isLoggedIn;
            const students = data.students;
            
            const tableBody = document.getElementById('students-table-body');
            tableBody.innerHTML = ''; 

            // ---> ДОДАНО: Скидаємо стан чекбокса і ховаємо кнопку при кожному оновленні таблиці
            if (checkboxSelectAll) checkboxSelectAll.checked = false;
            if (btnDeleteSelected) btnDeleteSelected.style.display = "none";
            // <---

            if (students.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">Студентів не знайдено</td></tr>';
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
                tableBody.appendChild(tr);
            });
            updateOnlineStatuses();
            
            // 3. ДОДАНО ВИКЛИК ПАГІНАЦІЇ!
            renderPagination(data.totalPages, data.currentPage);
        })
        .catch(error => console.error('Помилка завантаження студентів:', error));
}

function renderPagination(totalPages, currentPage) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = ''; 

    if (totalPages <= 1) return; 

    // Кнопка "Попередня" (<)
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadStudentsFromServer(currentPage - 1);
    paginationContainer.appendChild(prevBtn);

    // --- АЛГОРИТМ РОЗУМНОЇ ПАГІНАЦІЇ ---
    let pages = [];
    
    // 1. Визначаємо, які саме цифри треба показати
    for (let i = 1; i <= totalPages; i++) {
        // Показуємо: 1-шу сторінку, останню, і сусідні біля поточної (поточна - 1, поточна, поточна + 1)
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        }
    }

    let paginationWithDots = [];
    let lastAddedPage;
    
    // 2. Вставляємо трикрапки там, де є розриви між цифрами
    for (let page of pages) {
        if (lastAddedPage) {
            if (page - lastAddedPage === 2) {
                // Якщо розрив лише в одну цифру (наприклад між 1 і 3), краще показати "2", ніж трикрапку
                paginationWithDots.push(lastAddedPage + 1); 
            } else if (page - lastAddedPage !== 1) {
                // Якщо розрив великий - ставимо трикрапку
                paginationWithDots.push('...'); 
            }
        }
        paginationWithDots.push(page);
        lastAddedPage = page;
    }

    // 3. Малюємо кнопки на основі сформованого масиву
    for (let item of paginationWithDots) {
        const pageBtn = document.createElement('button');
        
        if (item === '...') {
            pageBtn.className = 'page-btn dots';
            pageBtn.textContent = '...';
            pageBtn.disabled = true; // Трикрапку не можна натиснути
            // Трохи стилізуємо, щоб вона не виглядала як звичайна кнопка
            pageBtn.style.background = 'transparent';
            pageBtn.style.border = 'none';
            pageBtn.style.cursor = 'default';
        } else {
            pageBtn.className = `page-btn ${item === currentPage ? 'active' : ''}`;
            pageBtn.textContent = item;
            pageBtn.onclick = () => loadStudentsFromServer(item);
        }
        
        paginationContainer.appendChild(pageBtn);
    }
    // -----------------------------------

    // Кнопка "Наступна" (>)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = currentPage === totalPages; 
    nextBtn.onclick = () => loadStudentsFromServer(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}



// ==========================================
// ГЕНЕРАТОР ТЕСТОВИХ ДАНИХ (SEEDER)
// ==========================================

// Прикріплюємо функцію до window, щоб її було видно в консолі браузера
window.addRandomStudent = function() {
    // Словники для випадкової генерації
    const maleNames = ['Bohdan', 'Ivan', 'Petro', 'Mykola', 'Oleksandr', 'Dmytro', 'Andriy', 'Taras'];
    const femaleNames = ['Daryna', 'Anna', 'Maria', 'Olena', 'Iryna', 'Kateryna', 'Sofia', 'Yulia'];
    const lastNames = ['Karaziia', 'Baranova', 'Shevchenko', 'Kovalenko', 'Boyko', 'Tkachenko', 'Melnyk', 'Kravchenko'];
    const groups = ['PZ-21', 'PZ-22', 'PZ-23', 'PZ-24', 'PZ-25', 'PZ-26'];

    // Допоміжна функція для вибору випадкового елемента з масиву
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Генеруємо дані
    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const firstName = gender === 'M' ? getRandom(maleNames) : getRandom(femaleNames);
    const lastName = getRandom(lastNames);
    const group = getRandom(groups);

    // Генеруємо випадкову дату між 1950-01-01 та 2010-12-31
    const startTime = new Date(1950, 0, 1).getTime();
    const endTime = new Date(2010, 11, 31).getTime();
    const randomTime = new Date(startTime + Math.random() * (endTime - startTime));
    const birthday = randomTime.toISOString().split('T')[0]; // Формат YYYY-MM-DD

    // Формуємо об'єкт для відправки (ключі мають збігатися з тими, що очікує PHP)
    const studentData = {
        id: "", 
        group: group,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        birthday: birthday
    };

    console.log(`Відправка: ${firstName} ${lastName} (${group})`);

    // Відправляємо запит на збереження
    return fetch("index.php?action=add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`✅ Успішно додано! ID: ${data.newId}`);

            if (typeof loadStudentsFromServer === "function") {
                loadStudentsFromServer(1); 
            }
        } else {
            console.error("❌ Помилка валідації сервера:", data.errors || data.message);
        }
    })
    .catch(error => console.error("Помилка мережі:", error));
};

// Функція для масового додавання студентів (наприклад, для перевірки пагінації)
window.seedStudents = async function(count = 5) {
    console.log(`Починаємо генерацію ${count} студентів...`);
    for (let i = 0; i < count; i++) {
        await window.addRandomStudent(); // Чекаємо, поки додасться поточний, щоб не перевантажити сервер
    }
    console.log("Генерацію завершено! Оновлюю таблицю...");
    
    // Оновлюємо таблицю (показуємо першу сторінку після додавання)
    if (typeof loadStudentsFromServer === "function") {
        loadStudentsFromServer(1);
    }
};