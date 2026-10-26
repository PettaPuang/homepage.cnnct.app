export function accessIsOwned(
  access: { accountId: string } | null | undefined,
  sessionAccountId: string,
): boolean {
  return Boolean(access) && access?.accountId === sessionAccountId;
}

export function originAllowed(
  originHeader: string | null,
  siteOrigin: string,
): boolean {
  if (!originHeader || !siteOrigin) {
    return false;
  }

  return originHeader === siteOrigin;
}

export function siteOrigin(requestUrl: string, nextAuthUrl: string | undefined): string {
  const configured = nextAuthUrl?.trim();
  if (configured) {
    return new URL(configured).origin;
  }

  return new URL(requestUrl).origin;
}

export function isDeveloperAccount(
  account: { isDeveloper: boolean; active: boolean } | null | undefined,
): boolean {
  return account?.isDeveloper === true && account.active === true;
}

export function isHttpsOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}
