import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: currentUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, ...body } = await req.json();

    if (action === "create") {
      const { email, password, name } = body;

      if (!email || !email.includes("@")) throw new Error("E-mail inválido");
      if (!password || password.length < 6) throw new Error("Senha deve ter pelo menos 6 caracteres");

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      if (existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)) {
        throw new Error("Este e-mail já está cadastrado");
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: name || null },
      });

      if (authError || !authData.user) throw new Error(authError?.message || "Falha ao criar usuário");

      // Permanent expiration (100 years)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);

      // Insert into test_users for permanent access
      const { error: testError } = await supabaseAdmin.from("test_users").insert({
        email: normalizedEmail,
        name: name?.trim() || null,
        analyses_limit: 9999,
        analyses_used: 0,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      });

      if (testError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Erro ao registrar acesso: ${testError.message}`);
      }

      // Insert profile
      await supabaseAdmin.from("profiles").insert({
        user_id: authData.user.id,
        email: normalizedEmail,
        name: name?.trim() || null,
      });

      return new Response(JSON.stringify({ success: true, message: "Usuário criado com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete") {
      const { user_id, email } = body;

      if (!user_id) throw new Error("ID do usuário não fornecido");

      // Delete from auth (cascades to profiles via FK if set, but we do manual cleanup)
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (authDeleteError) throw new Error(`Erro ao excluir usuário: ${authDeleteError.message}`);

      // Cleanup related data
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("cases").delete().eq("user_id", user_id);
      await supabaseAdmin.from("support_chats").delete().eq("user_id", user_id);
      await supabaseAdmin.from("chat_conversations").delete().eq("user_id", user_id);
      await supabaseAdmin.from("exam_comparisons").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);

      if (email) {
        await supabaseAdmin.from("test_users").delete().eq("email", email.toLowerCase());
      }

      return new Response(JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      throw new Error("Ação inválida");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
