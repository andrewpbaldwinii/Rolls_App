/**
 * HTTPS page for roll invites — SMS/email clients recognize https:// as tappable.
 * Opens the Rolls app via rollsapp:// (and shows a fallback "Open in Rolls" button).
 *
 * Deploy from project root:
 *   npx supabase functions deploy roll-invite
 *
 * Requires verify_jwt = false (see supabase/config.toml).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("t")?.trim();

  if (!token || token.length < 8) {
    return new Response("Invalid or missing invite token.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const pathToken = encodeURIComponent(token);
  const appLink = `rollsapp://roll/invite/${pathToken}`;
  // Chrome on Android often opens the app more reliably via intent: than raw custom scheme + JS redirect.
  const intentLink = `intent://roll/invite/${pathToken}#Intent;scheme=rollsapp;package=com.rollsapp;end`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="theme-color" content="#e8eef2"/>
  <title>Roll invite</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      background: linear-gradient(180deg, #e8eef2 0%, #f8fafc 100%);
      color: #111;
    }
    h1 { font-size: 1.35rem; margin: 0 0 12px; }
    p { color: #444; line-height: 1.5; max-width: 340px; margin: 0 0 20px; font-size: 15px; }
    .btn {
      display: inline-block;
      background: #0a7ea4;
      color: #fff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 17px;
      padding: 14px 28px;
      border-radius: 12px;
      margin: 6px 8px;
      box-shadow: 0 2px 8px rgba(10,126,164,0.35);
    }
    .btn-secondary {
      background: #334155;
      box-shadow: none;
      font-size: 15px;
    }
    .hint { font-size: 13px; color: #64748b; max-width: 340px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>You're invited to a Roll</h1>
  <p>Tap a button below to open the <strong>Rolls</strong> app and accept the invite. (Auto-redirect is disabled so this page stays visible in your browser.)</p>
  <p>
    <a class="btn" href="${appLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Open in Rolls</a>
  </p>
  <p>
    <a class="btn btn-secondary" href="${intentLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Open in Rolls (Android)</a>
  </p>
  <p class="hint">If the app doesn't open, install Rolls from the store, return here, and tap again. The invite only works inside the app.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
