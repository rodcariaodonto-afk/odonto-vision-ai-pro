import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-TEST-USER] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting test user creation");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create client to verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado - Token não fornecido");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      throw new Error("Não autorizado - Usuário não encontrado");
    }

    logStep("Checking admin status", { userId: currentUser.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: currentUser.id,
      _role: "admin",
    });

    if (roleError || !roleData) {
      throw new Error("Não autorizado - Acesso restrito a administradores");
    }

    logStep("Admin verified, parsing request body");

    // Parse request body
    const { email, password, name } = await req.json();

    // Validate inputs
    if (!email || !email.includes("@")) {
      throw new Error("E-mail inválido");
    }
    if (!password || password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres");
    }

    const normalizedEmail = email.trim().toLowerCase();

    logStep("Creating auth user", { email: normalizedEmail });

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      throw new Error("Este e-mail já está cadastrado no sistema");
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name || null,
      },
    });

    if (authError) {
      logStep("Auth creation error", { error: authError.message });
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Falha ao criar usuário no Auth");
    }

    logStep("Auth user created", { userId: authData.user.id });

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert into test_users table
    const { error: testUserError } = await supabaseAdmin.from("test_users").insert({
      email: normalizedEmail,
      name: name?.trim() || null,
      analyses_limit: 50,
      analyses_used: 0,
      is_active: true,
      expires_at: expiresAt.toISOString(),
    });

    if (testUserError) {
      logStep("Test user insert error", { error: testUserError.message });
      // If test_users insert fails, we should delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erro ao registrar testador: ${testUserError.message}`);
    }

    logStep("Test user inserted");

    // Insert into profiles table
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      email: normalizedEmail,
      name: name?.trim() || null,
    });

    if (profileError) {
      logStep("Profile insert error", { error: profileError.message });
      // Profile insert failed, but user is created - log warning but continue
      console.warn("Profile creation failed but user was created:", profileError);
    } else {
      logStep("Profile created");
    }

    logStep("Test user creation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
        message: "Usuário de teste criado com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logStep("Error", { error: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
