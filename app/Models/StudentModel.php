<?php

class StudentModel
{
    public function __construct()
    {
        // Ініціалізація стартових даних
        if (!isset($_SESSION['students'])) {
            $_SESSION['students'] = [
                ['id' => 1, 'group' => 'PZ-22', 'firstname' => 'Bohdan', 'lastname' => 'Karaziia', 'gender' => 'M', 'birthday' => '2007-06-12'],
                ['id' => 2, 'group' => 'PZ-22', 'firstname' => 'Daryna', 'lastname' => 'Baranova', 'gender' => 'F', 'birthday' => '2006-11-28']
            ];
        }
    }

    public function getAll()
    {
        return $_SESSION['students'];
    }

    public function getPaginated($page, $limit)
    {
        $offset = ($page - 1) * $limit;
        return array_slice($_SESSION['students'], $offset, $limit);
    }

    public function getTotalPages($limit)
    {
        return ceil(count($_SESSION['students']) / $limit);
    }

    public function isDuplicate($firstName, $lastName, $group, $excludeId = null)
    {
        foreach ($_SESSION['students'] as $s) {
            if ($s['firstname'] === $firstName && $s['lastname'] === $lastName && $s['group'] === $group) {
                if ($excludeId === null || $s['id'] != $excludeId) {
                    return true;
                }
            }
        }
        return false;
    }

    public function add($data)
    {
        $maxId = 0;
        foreach ($_SESSION['students'] as $s) {
            if ($s['id'] > $maxId)
                $maxId = $s['id'];
        }
        $newId = $maxId + 1;

        $data['id'] = $newId;
        $_SESSION['students'][] = $data;
        return $newId;
    }

    public function update($id, $data)
    {
        foreach ($_SESSION['students'] as $key => $s) {
            if ($s['id'] == $id) {
                $_SESSION['students'][$key] = array_merge($s, $data);
                return true;
            }
        }
        return false;
    }

    public function delete($id)
    {
        foreach ($_SESSION['students'] as $key => $s) {
            if ($s['id'] == $id) {
                unset($_SESSION['students'][$key]);
                $_SESSION['students'] = array_values($_SESSION['students']);
                return true;
            }
        }
        return false;
    }

    public function deleteMultiple($ids)
    {
        $_SESSION['students'] = array_filter($_SESSION['students'], function ($s) use ($ids) {
            return !in_array($s['id'], $ids);
        });
        $_SESSION['students'] = array_values($_SESSION['students']);
        return true;
    }
}