// ===== Cloudflare Worker — بروكسي Supabase لليمن =====
// كيفية النشر:
// 1. اذهب إلى https://workers.cloudflare.com وسجّل مجاناً
// 2. اضغط "Create Worker"
// 3. الصق هذا الكود كاملاً واضغط "Save & Deploy"
// 4. انسخ رابط الـ Worker (مثال: https://my-proxy.username.workers.dev)
// 5. افتح التطبيق → الإعدادات → رابط البروكسي → الصق الرابط واحفظ

const SUPABASE_URL = 'https://ezektgzwesrtezeghmrs.supabase.co';

export default {
  async fetch(request) {
    // معالجة طلبات CORS المسبقة
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, x-client-info, x-supabase-api-version, Range',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = SUPABASE_URL + url.pathname + url.search;

      const headers = new Headers();
      for (const [key, value] of request.headers.entries()) {
        if (!['host', 'cf-ray', 'cf-connecting-ip', 'x-forwarded-for'].includes(key.toLowerCase())) {
          headers.set(key, value);
        }
      }
      headers.set('host', new URL(SUPABASE_URL).host);

      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: body,
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer, x-client-info, x-supabase-api-version, Range');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
