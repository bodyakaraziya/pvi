<?php
session_start();
require_once 'app/controllers/StudentController.php';

$controller = new StudentController();
$action = $_GET['action'] ?? null;
$page = $_GET['page'] ?? 'student';

// 1. ОБРОБКА API (AJAX)
if ($action) {
    switch ($action) {
        case 'login':
            $controller->loginAction();
            break;
        case 'get_students':
            $controller->getListAction();
            break;
        case 'add':
            $controller->saveAction('add');
            break;
        case 'edit':
            $controller->saveAction('edit');
            break;
        case 'delete':
            $controller->deleteAction();
            break;
        case 'deleteMultiple':
            $controller->deleteMultipleAction();
            break;
    }
    exit();
}

// 2. ВІДОБРАЖЕННЯ СТОРІНОК
$isLoggedIn = isset($_SESSION['user']);
if (in_array($page, ['dashboard', 'task', 'message']) && !$isLoggedIn) {
    header("Location: index.php?page=student&auth_required=1");
    exit();
}

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
        break;
}