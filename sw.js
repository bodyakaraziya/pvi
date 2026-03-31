// Змінюємо версію кешу, щоб браузер зрозумів, що треба оновити файли
const CACHE_NAME = "pvi-lab-cache-v3"; 

const urlsToCache = [
    "./", // Кешуємо кореневий запит (зазвичай це index.php)
    
    // Кешуємо наші MVC-маршрути (сторінки)
    "./index.php?page=student",
    "./index.php?page=dashboard",
    "./index.php?page=task",
    "./index.php?page=message", 
    
    // Кешуємо статику (тепер вона лежить у папці public)
    "./public/css/style.css",
    "./public/js/script.js", 
    "./public/manifest.json",
    "./public/image/avatar.jpg",
    "./public/icons/app_icon.png"
];  

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Відкрито кеш");
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", event => {
    // Пропускаємо AJAX-запити до API (наприклад, додавання/видалення), 
    // щоб вони завжди йшли на сервер, а не бралися з кешу
    if (event.request.url.includes('action=')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            // Якщо файл є в кеші - віддаємо його, інакше йдемо в мережу
            return response || fetch(event.request);
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                          .map(name => caches.delete(name))
            );
        })
    );
});