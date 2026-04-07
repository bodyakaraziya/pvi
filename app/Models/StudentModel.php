<?php
require_once 'app/Models/Database.php';
class StudentModel
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // Пошук студента за склеєним Ім'ям та Прізвищем для логіну
    public function findByFullName($fullName)
    {
        // Використовуємо CONCAT, щоб склеїти колонки прямо в БД
        $stmt = $this->db->prepare("SELECT * FROM students WHERE CONCAT(firstname, ' ', lastname) = :fullname LIMIT 1");
        $stmt->bindValue(':fullname', $fullName);
        $stmt->execute();

        // Повертаємо 1 знайдений рядок або false, якщо не знайдено
        return $stmt->fetch();
    }

    public function getPaginated($page, $limit)
    {
        $offset = ($page - 1) * $limit;

        // Змінюємо DESC на ASC (або можна взагалі прибрати "ORDER BY id ASC", 
        // бо база даних і так сортує по ID за замовчуванням)
        // $stmt = $this->db->prepare("SELECT * FROM students ORDER BY id ASC LIMIT :limit OFFSET :offset");
        $stmt = $this->db->prepare("SELECT * FROM students LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getTotalPages($limit)
    {
        $stmt = $this->db->query("SELECT COUNT(*) FROM students");
        $totalRows = $stmt->fetchColumn();

        return ceil($totalRows / $limit);
    }

    public function isDuplicate($firstName, $lastName, $group, $excludeId = null)
    {
        $sql = "SELECT COUNT(*) FROM students WHERE firstname = :firstname AND lastname = :lastname AND `group` = :group";

        if ($excludeId) {
            $sql .= " AND id != :excludeId";
        }

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':firstname', $firstName);
        $stmt->bindValue(':lastname', $lastName);
        $stmt->bindValue(':group', $group);

        if ($excludeId) {
            $stmt->bindValue(':excludeId', $excludeId);
        }

        $stmt->execute();
        return $stmt->fetchColumn() > 0;
    }

    public function add($data)
    {
        $stmt = $this->db->prepare("INSERT INTO students (`group`, firstname, lastname, gender, birthday) VALUES (:group, :firstname, :lastname, :gender, :birthday)");

        $stmt->execute([
            ':group' => $data['group'],
            ':firstname' => $data['firstname'],
            ':lastname' => $data['lastname'],
            ':gender' => $data['gender'],
            ':birthday' => $data['birthday']
        ]);

        return $this->db->lastInsertId();
    }

    public function update($id, $data)
    {
        $stmt = $this->db->prepare("UPDATE students SET `group` = :group, firstname = :firstname, lastname = :lastname, gender = :gender, birthday = :birthday WHERE id = :id");

        return $stmt->execute([
            ':id' => $id,
            ':group' => $data['group'],
            ':firstname' => $data['firstname'],
            ':lastname' => $data['lastname'],
            ':gender' => $data['gender'],
            ':birthday' => $data['birthday']
        ]);
    }

    public function delete($id)
    {
        $stmt = $this->db->prepare("DELETE FROM students WHERE id = :id");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function deleteMultiple($ids)
    {
        // Створюємо рядок зі знаків питання типу (?, ?, ?) залежно від кількості ID
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $this->db->prepare("DELETE FROM students WHERE id IN ($placeholders)");
        return $stmt->execute($ids);
    }
}