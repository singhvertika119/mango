import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/utils/crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state"); // workspaceId was passed as state

  if (!code || !workspaceId) {
    return NextResponse.json({ error: "Missing OAuth code or state parameter" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "GitHub OAuth environment variables missing" }, { status: 500 });
  }

  try {
    // 1. Exchange authorization code for GitHub access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token returned in GitHub response.");
    }

    // 2. Encrypt token using AES-256-GCM helper
    const encryptedToken = encrypt(accessToken);

    // 3. Save integration record to database using server client
    const supabase = await createClient();
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert({
        workspace_id: workspaceId,
        provider: "github",
        credentials: encryptedToken,
        settings: {
          connected_at: new Date().toISOString()
        }
      }, {
        onConflict: "workspace_id,provider"
      });

    if (upsertError) throw upsertError;

    // 4. Redirect user back to the integrations setting page
    const redirectUrl = new URL(`/integrations`, req.url);
    redirectUrl.searchParams.set("workspaceId", workspaceId);
    
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error("GitHub OAuth Callback failed:", err);
    return NextResponse.json({ error: err.message || "Failed to process GitHub login." }, { status: 500 });
  }
}
