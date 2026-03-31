<?php
// session_destroy();
session_start();


// unset($_SESSION['students']);

// 1. Ініціалізація даних (без змін)
if (!isset($_SESSION['students'])) {
    $_SESSION['students'] = [
        ['id' => 1, 'group' => 'PZ-22', 'firstname' => 'Bohdan', 'lastname' => 'Karaziia', 'gender' => 'M', 'birthday' => '12.06.2007'],
        ['id' => 2, 'group' => 'PZ-22', 'firstname' => 'Daryna', 'lastname' => 'Baranova', 'gender' => 'F', 'birthday' => '28.11.2006']
    ];
}

if (isset($_GET['action']) && $_GET['action'] === 'login') {
    $user = trim($_POST['username'] ?? '');
    $pass = trim($_POST['password'] ?? '');

    // 1. Спочатку перевіряємо, чи це не адміністратор (резервний вхід)
    if ($user === 'admin' && $pass === 'admin') { // Можеш задати будь-який пароль
        // Створюємо "фейкового" студента-адміна, щоб інтерфейс (хедер) не зламався
        $_SESSION['user'] = [
            'id' => 0,
            'group' => 'Admin',
            'firstname' => 'Super',
            'lastname' => 'Admin',
            'gender' => 'M',
            'birthday' => ''
        ];
        header("Location: index.php?page=student");
        exit();
    }

    // 2. Якщо це не адмін, тоді шукаємо серед студентів
    $found = false;

    // Перевіряємо, чи масив взагалі існує і чи не порожній
    if (!empty($_SESSION['students'])) {
        foreach ($_SESSION['students'] as $s) {
            $fullName = $s['firstname'] . ' ' . $s['lastname'];

            // 1. Порівнюємо повне ім'я
            if ($fullName === $user) {
                // 2. Порівнюємо дати народження (пароль), перевівши їх у системний час, 
                // щоб "12.06.2007" і "2007-06-12" розпізнавалися як однакова дата
                if (strtotime($s['birthday']) === strtotime($pass)) {
                    $_SESSION['user'] = $s;
                    $found = true;
                    break;
                }
            }
        }
    }

    // 3. Результат логіну
    if ($found) {
        header("Location: index.php?page=student");
    } else {
        // Якщо логін неуспішний, просто повертаємо на головну (можна додати обробку помилки)
        header("Location: index.php?page=student&login_error=1");
    }
    exit();
}

// 2. ЗМІНА: тепер за замовчуванням 'student'
$page = $_GET['page'] ?? 'student';

// 3. Захист доступу
$isLoggedIn = isset($_SESSION['user']);
$restrictedPages = ['dashboard', 'task', 'message'];

if (in_array($page, $restrictedPages) && !$isLoggedIn) {
    // Якщо не залогінений, перенаправляємо на dashboard (де буде кнопка LogIn)
    header("Location: index.php?page=student&auth_required=1");
    exit();
}

// Обробка AJAX-запиту на ОТРИМАННЯ всіх студентів
if (isset($_GET['action']) && $_GET['action'] === 'get_students') {
    header('Content-Type: application/json');

    $loggedInStatus = isset($_SESSION['user']);
    $allStudents = isset($_SESSION['students']) ? $_SESSION['students'] : [];

    // --- ЛОГІКА ПАГІНАЦІЇ ---
    $limit = 11; // Скільки студентів на одній сторінці
    $page = isset($_GET['p']) ? (int) $_GET['p'] : 1; // Отримуємо номер сторінки з URL
    if ($page < 1)
        $page = 1;

    $totalStudents = count($allStudents); // Загальна кількість
    $totalPages = ceil($totalStudents / $limit); // Загальна кількість сторінок (заокруглюємо вгору)

    // Визначаємо, з якого індексу починати різати масив (Offset)
    $offset = ($page - 1) * $limit;

    // Відрізаємо потрібний шматок масиву для поточної сторінки
    // Для 4-ї лаби ти заміниш array_slice на SQL-запит: SELECT * FROM students LIMIT $limit OFFSET $offset
    $studentsList = array_slice($allStudents, $offset, $limit);

    // Відправляємо відповідь, додавши інформацію про сторінки
    echo json_encode([
        'isLoggedIn' => $loggedInStatus,
        'students' => $studentsList,
        'totalPages' => $totalPages,
        'currentPage' => $page
    ]);
    exit();
}

// ==========================================
// 1. Обробка AJAX-запиту на видалення ОДНОГО студента
// ==========================================
if (isset($_GET['action']) && $_GET['action'] === 'delete') {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Не авторизовано']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $idToDelete = $data['id'] ?? null;

    if ($idToDelete) {
        foreach ($_SESSION['students'] as $key => $student) {
            if ($student['id'] == $idToDelete) {
                unset($_SESSION['students'][$key]);
                $_SESSION['students'] = array_values($_SESSION['students']);

                echo json_encode(['success' => true]);
                exit();
            }
        }
    }

    echo json_encode(['success' => false, 'message' => 'Студента не знайдено']);
    exit();
}

// ==========================================
// 2. Обробка AJAX-запиту на МАСОВЕ видалення
// ==========================================
if (isset($_GET['action']) && $_GET['action'] === 'deleteMultiple') {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Не авторизовано']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $idsToDelete = $data['ids'] ?? []; // Отримуємо масив ID від JavaScript

    // Перевіряємо, чи нам дійсно прислали непорожній масив
    if (is_array($idsToDelete) && count($idsToDelete) > 0) {

        // Перебираємо всіх студентів у сесії
        foreach ($_SESSION['students'] as $key => $student) {
            // Якщо ID цього студента є в масиві на видалення (in_array)
            if (in_array($student['id'], $idsToDelete)) {
                unset($_SESSION['students'][$key]); // Видаляємо його
            }
        }

        // Переіндексовуємо масив після видалення
        $_SESSION['students'] = array_values($_SESSION['students']);

        echo json_encode(['success' => true]);
        exit();
    }

    echo json_encode(['success' => false, 'message' => 'Не передано коректних даних для видалення']);
    exit();
}

// ==========================================
// 3. Обробка AJAX-запиту на ДОДАВАННЯ студента
// ==========================================
if (isset($_GET['action']) && $_GET['action'] === 'add') {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Не авторизовано']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $errors = []; // Масив для збору помилок

    // Очищаємо дані
    $group = trim($data['group'] ?? '');
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $gender = trim($data['gender'] ?? '');
    $birthday = trim($data['birthday'] ?? '');

    // а) Перевірки на коректність вводу
    if (empty($group)) {
        $errors['group'] = "Група є обов'язковою.";
    }
    // Перевірка імені регулярним виразом (як у твоєму JS)
    if (empty($firstName) || !preg_match("/^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$/u", $firstName)) {
        $errors['firstName'] = "Введіть коректне ім'я.";
    }
    if (empty($lastName) || !preg_match("/^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$/u", $lastName)) {
        $errors['lastName'] = "Введіть коректне прізвище.";
    }
    if (!in_array($gender, ['M', 'F'])) {
        $errors['gender'] = "Оберіть стать (M або F).";
    }
    if (empty($birthday)) {
        $errors['birthday'] = "Введіть дату народження.";
    } else {
        // Перетворюємо рядок "YYYY-MM-DD" на системний час і витягуємо лише рік
        $year = (int) date('Y', strtotime($birthday));

        // Перевіряємо межі
        if ($year < 1950 || $year > 2010) {
            $errors['birthday'] = "Рік народження має бути в межах від 1950 до 2010.";
        }
    }

    // б) Перевірка на дублювання студентів
    if (empty($errors)) {
        foreach ($_SESSION['students'] as $s) {
            // Вважаємо дублікатом, якщо збігаються ПІБ та група
            if ($s['firstname'] === $firstName && $s['lastname'] === $lastName && $s['group'] === $group) {
                $errors['duplicate'] = "Студент {$firstName} {$lastName} вже існує у групі {$group}.";
                break;
            }
        }
    }

    // г) Відображати помилки у випадку негативної валідації
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'errors' => $errors]);
        exit();
    }

    // в) Після позитивної валідації записуємо в масив
    $maxId = 0;
    foreach ($_SESSION['students'] as $student) {
        if ($student['id'] > $maxId) {
            $maxId = $student['id'];
        }
    }

    $newId = $maxId + 1;
    $newStudent = [
        'id' => $newId,
        'group' => $group,
        'firstname' => $firstName,
        'lastname' => $lastName,
        'gender' => $gender,
        'birthday' => $birthday
    ];

    $_SESSION['students'][] = $newStudent;

    echo json_encode(['success' => true, 'newId' => $newId]);
    exit();
}

// ==========================================
// 4. Обробка AJAX-запиту на РЕДАГУВАННЯ
// ==========================================
if (isset($_GET['action']) && $_GET['action'] === 'edit') {
    if (!isset($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Не авторизовано']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $idToEdit = $data['id'] ?? null;
    $errors = [];

    if (!$idToEdit) {
        echo json_encode(['success' => false, 'message' => 'Не вказано ID студента']);
        exit();
    }

    // Очищаємо дані
    $group = trim($data['group'] ?? '');
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $gender = trim($data['gender'] ?? '');
    $birthday = trim($data['birthday'] ?? '');

    // а) Валідація на коректність (ідентична до додавання)
    if (empty($group)) {
        $errors['group'] = "Група є обов'язковою.";
    }
    if (empty($firstName) || !preg_match("/^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$/u", $firstName)) {
        $errors['firstName'] = "Введіть коректне ім'я.";
    }
    if (empty($lastName) || !preg_match("/^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$/u", $lastName)) {
        $errors['lastName'] = "Введіть коректне прізвище.";
    }
    if (!in_array($gender, ['M', 'F'])) {
        $errors['gender'] = "Оберіть стать (M або F).";
    }
    if (empty($birthday)) {
        $errors['birthday'] = "Введіть дату народження.";
    } else {
        $year = (int) date('Y', strtotime($birthday));
        if ($year < 1950 || $year > 2010) {
            $errors['birthday'] = "Рік народження має бути в межах від 1950 до 2010.";
        }
    }

    // б) Перевірка на дублювання (З УРАХУВАННЯМ ID)
    if (empty($errors)) {
        foreach ($_SESSION['students'] as $s) {
            if ($s['firstname'] === $firstName && $s['lastname'] === $lastName && $s['group'] === $group) {
                // Якщо ID знайшлися, але вони РІЗНІ - значить такий студент вже є окремо
                if ($s['id'] != $idToEdit) {
                    $errors['duplicate'] = "Студент {$firstName} {$lastName} вже існує у групі {$group}.";
                    break;
                }
            }
        }
    }

    // г) Відображення помилок у випадку негативної валідації
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'errors' => $errors]);
        exit();
    }

    // в) Запис у масив (успішна валідація)
    $updated = false;
    foreach ($_SESSION['students'] as $key => $student) {
        if ($student['id'] == $idToEdit) {
            $_SESSION['students'][$key]['group'] = $group;
            $_SESSION['students'][$key]['firstname'] = $firstName;
            $_SESSION['students'][$key]['lastname'] = $lastName;
            $_SESSION['students'][$key]['gender'] = $gender;
            $_SESSION['students'][$key]['birthday'] = $birthday;

            $updated = true;
            break;
        }
    }

    if ($updated) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Студента для редагування не знайдено']);
    }
    exit();
}



// 4. Маршрутизація (без змін, switch вже знає про 'student')
switch ($page) {
    case 'dashboard':
        require 'views/dashboard.php';
        break;
    case 'student':
        require 'views/student.php';
        break;
    case 'task':
        require 'views/task.php';
        break;
    case 'message':
        require 'views/message.php';
        break;
    case 'logout':
        unset($_SESSION['user']);
        header("Location: index.php?page=student");
        exit();
}