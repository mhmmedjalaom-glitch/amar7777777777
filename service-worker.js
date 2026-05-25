// ===== Service Worker - تطبيق ذكي وعمل بدون إنترنت =====
// PWA Service Worker - Offline Support & Smart Caching

const CACHE_NAME = 'mhamad-salem-v2-cache';
const API_CACHE = 'api-cache-v2';
const ASSETS_CACHE = 'assets-cache-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/index-v2.html',
  '/style.css',
  '/script.js',
  '/firebase.js',
  '/supabase-advanced.js',
  '/offline-sync.js',
  '/voice-control.js',
  '/export-utils.js',
  '/manifest.json'
];

// ===== تثبيت Service Worker =====
self.addEventListener('install', (event) => {
  console.log('🔧 تثبيت Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 تخزين الملفات الأساسية');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.warn('⚠️ خطأ في التخزين:', err))
  );

  self.skipWaiting();
});

// ===== تفعيل Service Worker =====
self.addEventListener('activate', (event) => {
  console.log('✅ تفعيل Service Worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== ASSETS_CACHE)
          .map((cacheName) => {
            console.log('🗑️ حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  self.clients.claim();
});

// ===== معالجة الطلبات (Fetch) =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // لا نخزّن طلبات من Supabase أو APIs خارجية
  if (request.method !== 'GET' || url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // استراتيجية مختلفة للأصول والـ APIs
  if (isAsset(url)) {
    event.respondWith(cacheAssets(request));
  } else if (isAPI(url)) {
    event.respondWith(cacheAPI(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

// ===== استراتيجيات التخزين =====

// 1. أصول (CSS, JS, صور) - Cache First
async function cacheAssets(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    console.warn('⚠️ فشل في جلب الأصل:', request.url);
    return new Response('غير متاح بدون إنترنت', {
      status: 503,
      statusText: 'غير متاح'
    });
  }
}

// 2. APIs - Network First مع fallback للـ cache
async function cacheAPI(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    console.warn('⚠️ فشل في جلب البيانات من الشبكة، استخدام الكاش:', request.url);
    
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return new Response(JSON.stringify({
      error: 'لا يوجد اتصال إنترنت',
      message: 'البيانات المحفوظة قديمة'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 3. صفحات - Cache First مع fallback لـ Network
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    console.warn('⚠️ لا يوجد اتصال:', request.url);
    
    return new Response('هذه الصفحة غير متاحة بدون إنترنت', {
      status: 503,
      statusText: 'لا يوجد اتصال'
    });
  }
}

// ===== Helper Functions =====
function isAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname);
}

function isAPI(url) {
  return url.hostname === 'ezektgzwesrtezeghmrs.supabase.co' ||
         url.hostname.includes('api.') ||
         url.pathname.includes('/api/');
}

// ===== معالجة الرسائل من الصفحة =====
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      caches.delete(data.cacheName);
      break;

    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      });
      break;

    default:
      console.log('رسالة غير معروفة:', type);
  }
});

// ===== تخزين URLs إضافية =====
async function cacheUrls(urls) {
  const cache = await caches.open(ASSETS_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        cache.put(url, response);
      }
    } catch (error) {
      console.warn('⚠️ فشل في تخزين:', url, error);
    }
  }
}

// ===== حجم الكاش =====
async function getCacheSize() {
  let size = 0;
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        size += blob.size;
      }
    }
  }

  return size;
}

// ===== Background Sync (للعمليات المعلقة) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transfers') {
    event.waitUntil(syncTransfers());
  }
});

async function syncTransfers() {
  try {
    const db = await openDatabase();
    const transactions = await getAllTransactions(db);

    for (const transaction of transactions) {
      await fetch('https://ezektgzwesrtezeghmrs.supabase.co/rest/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum`
        },
        body: JSON.stringify(transaction)
      });
    }

    console.log('✅ تمت مزامنة الحوالات المعلقة');
  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error);
  }
}

// ===== IndexedDB (للبيانات المعقدة) =====
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MohamadSalem', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('transfers')) {
        db.createObjectStore('transfers', { keyPath: 'id' });
      }
    };
  });
}

function getAllTransactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transfers', 'readonly');
    const store = transaction.objectStore('transfers');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

console.log('✅ Service Worker جاهز');
