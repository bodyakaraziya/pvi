<?php
require_once 'app/models/StudentModel.php';

class StudentController
{
    private $model;

    public function __construct()
    {
        $this->model = new StudentModel();
    }

    // ЛОГІКА ВХОДУ
    public function loginAction()
    {
        $user = trim($_POST['username'] ?? '');
        $pass = trim($_POST['password'] ?? '');

        // 1. Перевірка адміна
        if ($user === 'admin' && $pass === 'ad123') {
            $_SESSION['user'] = ['firstname' => 'Super', 'lastname' => 'Admin', 'group' => 'Admin'];
            header("Location: index.php?page=student");
            exit();
        }

        // 2. Пошук студента
        foreach ($this->model->getAll() as $s) {
            if ($s['firstname'] . ' ' . $s['lastname'] === $user && strtotime($s['birthday']) === strtotime($pass)) {
                $_SESSION['user'] = $s;
                header("Location: index.php?page=student");
                exit();
            }
        }
        header("Location: index.php?page=student&login_error=1");
    }

    // ОТРИМАННЯ СПИСКУ (AJAX)
    public function getListAction()
    {
        $limit = 5;
        $page = isset($_GET['p']) ? (int) $_GET['p'] : 1;

        echo json_encode([
            'isLoggedIn' => isset($_SESSION['user']),
            'students' => $this->model->getPaginated($page, $limit),
            'totalPages' => $this->model->getTotalPages($limit),
            'currentPage' => $page
        ]);
    }

    // ВАЛІДАЦІЯ ТА ДОДАВАННЯ/РЕДАГУВАННЯ
    public function saveAction($mode = 'add')
    {
        if (!isset($_SESSION['user'])) {
            echo json_encode(['success' => false, 'message' => 'Не авторизовано']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $errors = $this->validate($data, ($mode === 'edit' ? $data['id'] : null));

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            return;
        }

        $studentData = [
            'group' => trim($data['group']),
            'firstname' => trim($data['firstName']),
            'lastname' => trim($data['lastName']),
            'gender' => $data['gender'],
            'birthday' => $data['birthday']
        ];

        if ($mode === 'add') {
            $newId = $this->model->add($studentData);
            echo json_encode(['success' => true, 'newId' => $newId]);
        } else {
            $this->model->update($data['id'], $studentData);
            echo json_encode(['success' => true]);
        }
    }

    public function deleteAction()
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $res = $this->model->delete($data['id']);
        echo json_encode(['success' => $res]);
    }

    public function deleteMultipleAction()
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $res = $this->model->deleteMultiple($data['ids'] ?? []);
        echo json_encode(['success' => $res]);
    }

    private function validate($data, $id = null)
    {
        $errors = [];
        $nameReg = "/^[A-Za-zА-Яа-яЇїЄєІіҐґ]([A-Za-zА-Яа-яЇїЄєІіҐґ\'’\-]*[A-Za-zА-Яа-яЇїЄєІіҐґ])?$/u";

        if (empty($data['group']))
            $errors['group'] = "Оберіть групу.";
        if (!preg_match($nameReg, $data['firstName'] ?? ''))
            $errors['firstName'] = "Коректне ім'я обов'язкове.";
        if (!preg_match($nameReg, $data['lastName'] ?? ''))
            $errors['lastName'] = "Коректне прізвище обов'язкове.";

        $year = (int) date('Y', strtotime($data['birthday'] ?? ''));
        if ($year < 1950 || $year > 2010)
            $errors['birthday'] = "Рік має бути 1950-2010.";

        if (empty($errors)) {
            if ($this->model->isDuplicate($data['firstName'], $data['lastName'], $data['group'], $id)) {
                $errors['duplicate'] = "Такий студент вже існує в цій групі.";
            }
        }
        return $errors;
    }
}