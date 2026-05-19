const GOOGLE_AUTH_BLOCKED_USER_AGENTS = [
  /Line\//i,
  /FBAN|FBAV|FB_IAB/i,
  /Instagram/i,
  /MicroMessenger/i,
];

export function isGoogleAuthBlockedBrowser(userAgent = navigator.userAgent): boolean {
  return GOOGLE_AUTH_BLOCKED_USER_AGENTS.some((pattern) => pattern.test(userAgent));
}

export function isLineInAppBrowser(userAgent = navigator.userAgent): boolean {
  return /Line\//i.test(userAgent);
}

export async function copyCurrentUrl(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href);
}
