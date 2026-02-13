import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS: allow localhost for dev and Vercel production domain
const allowedOrigins = [
  Deno.env.get("SITE_URL") || "",
  "https://project-compass-nine.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[1],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function jsonResponse(cors: Record<string, string>, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Simple in-memory rate limiter: max 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(cors, { error: "Unauthorized" });
    }

    // Verify token and extract user ID for rate limiting
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return jsonResponse(cors, { error: "Unauthorized" });
    }

    // Rate limit check
    if (isRateLimited(caller.id)) {
      return jsonResponse(cors, { error: "Too many requests. Try again later." });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return jsonResponse(cors, { error: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return jsonResponse(cors, { error: "Invalid email format" });
    }

    // Use service role to find user by email
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Search through users with pagination to find exact email match
    let foundUser = null;
    let page = 1;
    const perPage = 50;

    while (!foundUser) {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      if (!users || users.length === 0) break;

      foundUser = users.find((u) => u.email?.toLowerCase() === trimmedEmail) || null;
      if (users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    if (!foundUser) {
      return jsonResponse(cors, { error: "User not found" });
    }

    // Return only the user id and name from profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, name")
      .eq("id", foundUser.id)
      .single();

    return jsonResponse(cors, { id: foundUser.id, name: profile?.name || trimmedEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse(cors, { error: message });
  }
});
