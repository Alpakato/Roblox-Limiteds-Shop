// src/app/lib/cookie.ts
export function setCookie(name: string, value: string, days = 180) {
  if (typeof document === 'undefined') return; // SSR guard
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // SSR guard
  const n = name + '=';
  const ca = document.cookie.split(';').map((c) => c.trim());
  for (const c of ca) {
    if (c.indexOf(n) === 0) return decodeURIComponent(c.substring(n.length));
  }
  return null;
}

export function eraseCookie(name: string) {
  if (typeof document === 'undefined') return; // SSR guard
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
}
