const addResourcesToCache = async (resources) => { // https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
    const cache = await caches.open("v1");
    await cache.addAll(resources);
  };
  

self.addEventListener('activate', e => self.clients.claim());


self.addEventListener("install", (event) => {
    event.waitUntil(
      addResourcesToCache([
        "./",
        "./index.html",
        "./fix.js",
        "./main.js",
      ])
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
    );
});