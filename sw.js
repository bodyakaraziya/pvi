// Змінюємо версію кешу, щоб браузер зрозумів, що треба оновити файли
const CACHE_NAME = "pvi-lab-cache-v4"; 

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
    // 1. API-запити (додавання, логін, отримання даних) ігноруємо, вони йдуть ТІЛЬКИ на сервер
    if (event.request.url.includes('action=')) {
        return; 
    }

    // 2. Стратегія "Network First" для всього іншого (HTML, CSS, JS)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Якщо є зв'язок з сервером - беремо свіжу сторінку,
                // непомітно оновлюємо її в кеші і віддаємо користувачу
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Якщо інтернету немає взагалі (офлайн) - дістаємо збережене з кешу
                return caches.match(event.request);
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