import { NextResponse } from "next/server";
import { acceptInvitationForUser } from "@/lib/app-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AcceptInvitationRouteProps = {
  params: Promise<{ token: string }>;
};

export async function POST(
  request: Request,
  { params }: AcceptInvitationRouteProps,
) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/invitacion/${token}`, request.url),
      { status: 303 },
    );
  }

  try {
    await acceptInvitationForUser(user, token);
  } catch (error) {
    const url = new URL(`/invitacion/${token}`, request.url);
    url.searchParams.set(
      "error",
      error instanceof Error
        ? error.message
        : "No pudimos aceptar la invitacion.",
    );
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.redirect(new URL("/familia?accepted=1", request.url), {
    status: 303,
  });
}
