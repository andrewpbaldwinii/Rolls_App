/**
 * Sends a print-order notification email (Resend). Requires a logged-in user.
 *
 * Setup:
 *   1. Create a Resend account (https://resend.com) and an API key.
 *   2. supabase secrets set RESEND_API_KEY=re_xxxx
 *   3. Optional: supabase secrets set PRINT_ORDERS_TO=you@example.com
 *   4. Optional: supabase secrets set PRINT_ORDER_FROM="Rolls <onboarding@resend.dev>"
 *      (use onboarding@resend.dev until your domain is verified in Resend)
 *
 * Deploy:
 *   npx supabase functions deploy send-print-order
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  subject?: string;
  text?: string;
  rollId?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const subject = (body.subject ?? "").trim().slice(0, 200);
  const text = (body.text ?? "").trim().slice(0, 20000);
  const rollId = (body.rollId ?? "").toString().slice(0, 80);

  if (!subject || !text) {
    return new Response(JSON.stringify({ ok: false, error: "subject and text required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        useMailto: true,
        error: "Email delivery is not configured (missing RESEND_API_KEY).",
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const to = Deno.env.get("PRINT_ORDERS_TO") ?? "andrew.p.baldwinii@gmail.com";
  const from =
    Deno.env.get("PRINT_ORDER_FROM") ?? "Rolls Prints <onboarding@resend.dev>";

  const footer = `\n\n—\nUser: ${userData.user.email ?? userData.user.id}\nRoll ID: ${rollId || "n/a"}`;
  const fullText = text + footer;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: fullText,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("Resend error:", res.status, raw);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Email provider rejected the message. Check Resend dashboard and FROM address.",
        detail: raw.slice(0, 500),
      }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
