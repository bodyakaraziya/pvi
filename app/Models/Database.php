<?php

class Database
{
    private static $connection = null;

    public static function getConnection()
    {
        if (self::$connection === null) {
            $host = 'localhost';
            $dbname = 'pvi_lab';
            $username = 'root';      // Стандартний логін Laragon
            $password = '';          // Пароль у Laragon за замовчуванням порожній

            try {
                // Створюємо з'єднання
                self::$connection = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);

                // Налаштовуємо PDO так, щоб він викидав нормальні помилки, якщо SQL-запит написаний неправильно
                self::$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                // Налаштовуємо, щоб вибірка даних за замовчуванням повертала асоціативний масив
                self::$connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            } catch (PDOException $e) {
                // Якщо підключитися не вдалося - зупиняємо скрипт і виводимо помилку
                die("Помилка підключення до бази даних: " . $e->getMessage());
            }
        }

        return self::$connection;
    }
}