const CACHE_NAME = "pvi-lab-cache-v4"; 

const urlsToCache = [
    "./", 
    
    "./index.php?page=student",
    "./index.php?page=dashboard",
    "./index.php?page=task",
    "./index.php?page=message", 
    
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
    if (event.request.url.includes('action=')) {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
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