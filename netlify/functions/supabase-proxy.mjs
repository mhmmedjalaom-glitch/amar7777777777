const SUPA_URL = "https://ezektgzwesrtezeghmrs.supabase.co";
  const SUPA_KEY = "sb_publishable_yxYW7KsjVtq_0kMYuaODng_4yvhyRum";

  export default async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,apikey,Authorization,Prefer,Range",
        },
      });
    }
    try {
      const url = new URL(request.url);
      const supaPath = url.pathname.replace(/^\/?api\/supabase-proxy/, "");
      const targetUrl = `${SUPA_URL}${supaPath}${url.search}`;
      const headers = {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      };
      const prefer = request.headers.get("prefer");
      if (prefer) headers["Prefer"] = prefer;
      const fetchOptions = { method: request.method, headers };
      if (request.method !== "GET" && request.method !== "DELETE") {
        const body = await request.text();
        if (body) fetchOptions.body = body;
      }
      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "proxy_error" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  };

  export const config = { path: "/api/supabase-proxy/*" };
  