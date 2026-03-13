import { NextResponse } from "next/server";
import { acceptInvitationForUser } from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getInvitationTokenFromNextPath(nextPath: string) {
  const match = nextPath.match(/^\/invitacion\/([^/?#]+)$/);

  return match?.[1] ?? null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const invitationToken = getInvitationTokenFromNextPath(next);
  const supabase = await createServerSupabaseClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (invitationToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        const acceptedInvitation = await acceptInvitationForUser(user, invitationToken);
        const redirectUrl = new URL("/dashboard", requestUrl.origin);

        redirectUrl.searchParams.set("joined", "1");
        redirectUrl.searchParams.set("joinedFamily", acceptedInvitation.familyName);

        return NextResponse.redirect(redirectUrl);
      } catch (error) {
        const invitationUrl = new URL(next, requestUrl.origin);

        invitationUrl.searchParams.set(
          "error",
          error instanceof Error
            ? error.message
            : "No pudimos completar la union a la familia.",
        );

        return NextResponse.redirect(invitationUrl, { status: 303 });
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
