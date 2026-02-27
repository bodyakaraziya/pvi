// ==========================================
// 1. ЗАГАЛЬНИЙ ІНТЕРФЕЙС (Sidebar, Header)
// ==========================================

const iconBell = document.querySelector(".bell-icon");
let timerNotification = null;

if (iconBell) {
    iconBell.addEventListener("click", () => {
        if (timerNotification) return;

        timerNotification = setTimeout(() => {
            window.location.href = "message.html"; 
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
// 2. ЛОГІКА СТОРІНКИ СТУДЕНТІВ
// ==========================================

const tableBodyStudents = document.getElementById("students-table-body");

if (tableBodyStudents) {

    // --- 2.1. Оголошення DOM-елементів ---

    const btnAddStudent = document.querySelector(".btn-add");
    const btnDeleteSelected = document.querySelector(".btn-delete-all");
    const checkboxSelectAll = document.querySelector("#select-all");
    const labelUserName = document.querySelector(".user-name");

    // Елементи модального вікна "Додавання / Редагування"
    const modalStudent = document.getElementById("add-modal");
    const titleModalStudent = modalStudent?.querySelector(".modal-title");
    const btnSaveStudent = modalStudent?.querySelector(".btn-create");
    const btnCloseStudentModal = modalStudent?.querySelector(".btn-close");
    const btnCancelStudentModal = modalStudent?.querySelector(".btn-cancel");

    // Елементи форми
    const inputGroup = document.getElementById("group");
    const inputFirstName = document.getElementById("first-name");
    const inputLastName = document.getElementById("last-name");
    const selectGender = document.getElementById("gender");
    const inputBirthday = document.getElementById("birthday");

    // Елементи модального вікна "Підтвердження видалення"
    const modalDelete = document.getElementById("delete-modal");
    const spanDeleteUserName = document.getElementById("delete-user-name");
    const btnConfirmDelete = document.getElementById("confirm-delete");
    const btnCancelDelete = document.getElementById("cancel-delete");
    const btnCloseDeleteModal = document.getElementById("close-delete-modal");

    // --- 2.2. Змінні стану ---

    let nextStudentId = 4; // Лічильник для нових записів
    let idEditingRow = null; // ID рядка, який зараз редагується
    let idDeletingRow = null; // ID рядка, який планується видалити (одиничне видалення)


    // --- 2.3. Допоміжні функції ---

    // Форматування дат
    function convertDateToInputFormat(dateStr) {
        if (!dateStr) return "";
        const [day, month, year] = dateStr.split(".");
        return `${year}-${month}-${day}`;
    }

    function convertDateToTableFormat(dateStr) {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}.${month}.${year}`;
    }

    // Робота з ПІБ
    function splitFullName(fullName) {
        const parts = fullName.trim().split(/\s+/);
        return {
            firstName: parts[0] || "",
            lastName: parts[1] || ""
        };
    }

    // Очищення полів форми
    function clearStudentForm() {
        if (inputGroup) inputGroup.value = "";
        if (inputFirstName) inputFirstName.value = "";
        if (inputLastName) inputLastName.value = "";
        if (selectGender) selectGender.value = "";
        if (inputBirthday) inputBirthday.value = "";
        idEditingRow = null;
    }

    // Оновлення видимості кнопки "Видалити вибраних"
    function updateDeleteButtonVisibility() {
        const allCheckboxes = document.querySelectorAll(".select-student");
        const anyChecked = Array.from(allCheckboxes).some(c => c.checked);
        const allChecked = Array.from(allCheckboxes).every(c => c.checked) && allCheckboxes.length > 0;

        btnDeleteSelected.style.display = anyChecked ? "block" : "none";
        checkboxSelectAll.checked = allChecked;
    }


    // --- 2.4. Встановлення статусів (Online/Offline) ---

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

    // Викликаємо одразу для наявних студентів
    updateOnlineStatuses();


    // --- 2.5. Обробка подій всередині таблиці (Делегування) ---
    // Слухаємо кліки на всьому тілі таблиці, щоб працювало для динамічних рядків

    tableBodyStudents.addEventListener("click", function (e) {
        
        // 1. Клік по чекбоксу студента
        if (e.target.classList.contains("select-student")) {
            updateDeleteButtonVisibility();
        }

        // 2. Клік по кнопці "Редагувати"
        const btnEdit = e.target.closest(".btn-edit");
        if (btnEdit && modalStudent) {
            const row = btnEdit.closest("tr");
            idEditingRow = row.dataset.id;

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

            modalStudent.style.display = "flex";
        }

        // 3. Клік по кнопці "Видалити" (окремий студент)
        const btnDeleteRow = e.target.closest(".btn-delete");
        if (btnDeleteRow && modalDelete) {
            const row = btnDeleteRow.closest("tr");
            idDeletingRow = row.dataset.id; 
            
            // Дістаємо ім'я студента з третьої колонки і вставляємо в span
            if (spanDeleteUserName) {
                spanDeleteUserName.textContent = row.cells[2].textContent.trim();
            }
            
            modalDelete.style.display = "flex";
        }
    });

    // Клік по головному чекбоксу "Вибрати всіх"
    if (checkboxSelectAll) {
        checkboxSelectAll.addEventListener("change", () => {
            const allCheckboxes = document.querySelectorAll(".select-student");
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = checkboxSelectAll.checked;
            });
            updateDeleteButtonVisibility();
        });
    }


    // --- 2.6. Логіка модального вікна додавання/редагування ---

    // Відкриття для додавання
    if (btnAddStudent && modalStudent) {
        btnAddStudent.addEventListener("click", () => {
            clearStudentForm();
            titleModalStudent.textContent = "Add student";
            btnSaveStudent.textContent = "Create";
            btnSaveStudent.dataset.mode = "create";
            modalStudent.style.display = "flex";
        });
    }

    // Закриття вікна
    function closeStudentModal() {
        modalStudent.style.display = "none";
        clearStudentForm();
    };

    if (btnCloseStudentModal) btnCloseStudentModal.addEventListener("click", closeStudentModal);
    if (btnCancelStudentModal) btnCancelStudentModal.addEventListener("click", closeStudentModal);

    // Збереження форми
    if (btnSaveStudent) {
        btnSaveStudent.addEventListener("click", () => {
            const mode = btnSaveStudent.dataset.mode;
            const groupVal = inputGroup.value.trim();
            const firstNameVal = inputFirstName.value.trim();
            const lastNameVal = inputLastName.value.trim();
            const genderVal = selectGender.value;
            const birthdayVal = inputBirthday.value;
            
            const fullName = [firstNameVal, lastNameVal].filter(Boolean).join(" ");

            if (!groupVal || !fullName || !birthdayVal) {
                alert("Please fill in all required fields.");
                return;
            }

            if (mode === "create") {
                const tr = document.createElement("tr");
                tr.dataset.id = nextStudentId++;
                tr.innerHTML = `
                    <td><input type="checkbox" class="select-student"></td>
                    <td>${groupVal}</td>
                    <td>${fullName}</td>
                    <td>${genderVal}</td>
                    <td>${convertDateToTableFormat(birthdayVal)}</td>
                    <td><span class="status status--offline"></span></td>
                    <td>
                        <button class="btn-edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="edit-icon" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" /></svg>
                        </button>
                        <button class="btn-delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="delete-icon" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" /></svg>
                        </button>
                    </td>
                `;
                tableBodyStudents.appendChild(tr);
            } else if (mode === "edit" && idEditingRow) {
                const row = document.querySelector(`tr[data-id="${idEditingRow}"]`);
                if (row) {
                    row.cells[1].textContent = groupVal;
                    row.cells[2].textContent = fullName;
                    row.cells[3].textContent = genderVal;
                    row.cells[4].textContent = convertDateToTableFormat(birthdayVal);
                }
            }

            closeStudentModal();
            updateOnlineStatuses(); // Оновлюємо статуси після зміни даних
        });
    }


    // --- 2.7. Логіка модального вікна видалення ---

    // Відкриття вікна при натисканні на "Видалити вибраних" (масове видалення)
if (btnDeleteSelected && modalDelete) {
    btnDeleteSelected.addEventListener("click", () => {
        idDeletingRow = null; 
        
        // Змінюємо текст для масового видалення
        if (spanDeleteUserName) {
            spanDeleteUserName.textContent = "all selected users";
        }
        
        modalDelete.style.display = "flex";
    });
}

    // Закриття вікна видалення
    const closeDeleteModal = () => {
        modalDelete.style.display = "none";
        idDeletingRow = null;
    };

    if (btnCancelDelete) btnCancelDelete.addEventListener("click", closeDeleteModal);
    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener("click", closeDeleteModal);

    // Підтвердження видалення
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener("click", () => {
            if (idDeletingRow) {
                // Одиничне видалення
                const rowToRemove = document.querySelector(`tr[data-id="${idDeletingRow}"]`);
                if (rowToRemove) rowToRemove.remove();
            } else {
                // Масове видалення вибраних чекбоксів
                const allCheckboxes = document.querySelectorAll(".select-student");
                allCheckboxes.forEach(checkbox => {
                    if (checkbox.checked) {
                        const row = checkbox.closest("tr");
                        if (row) row.remove();
                    }
                });
            }
            
            closeDeleteModal();
            updateDeleteButtonVisibility(); // Сховаємо кнопку "Видалити вибраних", якщо таблиця порожня
        });
    }
}