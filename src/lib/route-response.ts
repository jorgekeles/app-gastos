import { NextResponse } from "next/server";

export function getSafeReturnTo(formData: FormData, fallbackPath: string) {
  const rawPath = String(formData.get("returnTo") ?? fallbackPath).trim();

  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return fallbackPath;
  }

  return rawPath;
}

export function redirectWithQuery(
  request: Request,
  pathname: string,
  query: Record<string, string>,
) {
  const url = new URL(pathname, request.url);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}
