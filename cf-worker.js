// =================================================================
// بروكسي محمد سالم — Cloudflare Worker
// ينقل الطلبات من التطبيق إلى Supabase عبر شبكة Cloudflare العالمية
// =================================================================

const SUPABASE_URL = "https://ezektgzwesrtezeghmrs.supabase.co";
const ALLOWED_ORIGIN = "https://mhmmedjalaom-glitch.github.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "apikey,authorization,content-type,prefer,accept,x-client-info",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = SUPABASE_URL + url.pathname + url.search;

      // نقل الرؤوس مع إزالة host
      const fwdHeaders = new Headers(request.headers);
      fwdHeaders.delete("host");
      fwdHeaders.delete("cf-connecting-ip");
      fwdHeaders.delete("cf-ipcountry");
      fwdHeaders.delete("cf-ray");
      fwdHeaders.delete("cf-visitor");
      fwdHeaders.delete("x-forwarded-for");

      const body = (request.method === "GET" || request.method === "HEAD")
        ? null : request.body;

      const resp = await fetch(targetUrl, {
        method: request.method,
        headers: fwdHeaders,
        body,
      });

      // إعادة الرد مع رؤوس CORS
      const newResp = new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      });
      Object.entries(CORS_HEADERS).forEach(([k, v]) => newResp.headers.set(k, v));
      return newResp;

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  },
};
