import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return errorResponse("Unauthorized", 401);
    }

    const callerId = userData.user.id;

    // Get caller profile to check role
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile || (callerProfile.role !== "hr_admin" && callerProfile.role !== "super_admin")) {
      return errorResponse("Only HR admins or super admins can manage employees", 403);
    }

    const body = await req.json();
    const action = body.action;

    const VALID_ROLES = ["employee", "manager", "hr_admin"];
    function isValidRole(r: unknown): r is string {
      return typeof r === "string" && (VALID_ROLES as readonly string[]).includes(r);
    }

    if (action === "create") {
      const {
        email, password, first_name, last_name, role, employee_id,
        job_title, phone, hire_date, manager_id, nick_name,
        gender, date_of_birth, marital_status, nationality, home_address,
        emergency_contact_name, emergency_contact_phone,
        bank_name, bank_account_number,
        employment_type, employment_status, department,
        work_experience, education_details, dependents,
      } = body;

      if (!email || !password || !first_name || !last_name) {
        return errorResponse("Missing required fields", 400);
      }

      const finalRole = role || "employee";
      if (!isValidRole(finalRole)) {
        return errorResponse("Invalid role", 400);
      }
      if ((finalRole === "hr_admin") && callerProfile.role !== "super_admin") {
        return errorResponse("Only super admins can assign hr_admin role", 403);
      }

      // Create auth user
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role: finalRole },
      });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      // Upsert profile
      const { error: profErr } = await adminClient.from("profiles").upsert({
        id: userId,
        employee_id: employee_id || null,
        first_name,
        last_name,
        nick_name: nick_name || null,
        email,
        role: finalRole,
        job_title: job_title || null,
        phone: phone || null,
        hire_date: hire_date || null,
        manager_id: manager_id || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        marital_status: marital_status || null,
        nationality: nationality || null,
        home_address: home_address || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        bank_name: bank_name || null,
        bank_account_number: bank_account_number || null,
        employment_type: employment_type || "full_time",
        employment_status: employment_status || "active",
        department: department || null,
        work_experience: work_experience || [],
        education_details: education_details || [],
        dependents: dependents || [],
      });

      if (profErr) throw profErr;

      // Audit log
      await adminClient.from("audit_logs").insert({
        actor_id: callerId,
        action: "create",
        entity: "employee",
        entity_id: userId,
        details: { name: `${first_name} ${last_name}`, email },
      });

      return jsonResponse({ success: true, userId });
    }

    if (action === "update") {
      const { id, ...updates } = body;
      if (!id) return errorResponse("Missing employee id", 400);

      const { password, ...profileUpdates } = updates;

      // Update profile
      const { error: profErr } = await adminClient
        .from("profiles")
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (profErr) throw profErr;

      // Update password if provided
      if (password) {
        const { error: pwErr } = await adminClient.auth.admin.updateUserById(id, { password });
        if (pwErr) throw pwErr;
      }

      // Audit log
      await adminClient.from("audit_logs").insert({
        actor_id: callerId,
        action: "update",
        entity: "employee",
        entity_id: id,
        details: { fields: Object.keys(profileUpdates) },
      });

      return jsonResponse({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return errorResponse("Missing employee id", 400);

      const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
      if (delErr) throw delErr;

      await adminClient.from("audit_logs").insert({
        actor_id: callerId,
        action: "delete",
        entity: "employee",
        entity_id: id,
      });

      return jsonResponse({ success: true });
    }

    return errorResponse("Unknown action", 400);
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
