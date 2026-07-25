import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dbUrl = Deno.env.get("DATABASE_URL")!;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return errorResponse("Unauthorized", 401);
    }

    const client = new (await import("npm:pg@8.13.0")).Client({
      connectionString: dbUrl,
    });
    await client.connect();

    try {
      if (req.method === "GET") {
        const result = await client.query("SELECT name FROM departments ORDER BY name");
        return jsonResponse({ departments: result.rows.map((r: { name: string }) => r.name) });
      }

      if (req.method === "POST") {
        const { name } = await req.json();
        if (!name || typeof name !== "string" || !name.trim()) {
          return errorResponse("Department name is required", 400);
        }

        const trimmed = name.trim();
        const existing = await client.query("SELECT name FROM departments WHERE name = $1", [trimmed]);
        if (existing.rows.length > 0) {
          return jsonResponse({ name: existing.rows[0].name });
        }

        const inserted = await client.query(
          "INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING name",
          [trimmed],
        );
        return jsonResponse({ name: inserted.rows[0]?.name ?? trimmed });
      }

      return errorResponse("Method not allowed", 405);
    } finally {
      await client.end();
    }
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}