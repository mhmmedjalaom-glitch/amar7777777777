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
      // Handle both direct function URL and redirected URL
      const supaPath = url.pathname.replace(/^.*\/supabase-proxy/, "") || "/";
      const targetUrl = `${SUPA_URL}${supaPath}${url.search}`;
      const reqHeaders = {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      };
      const prefer = request.headers.get("prefer");
      if (prefer) reqHeaders["Prefer"] = prefer;
      const fetchOptions = { method: request.method, headers: reqHeaders };
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
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  };
  