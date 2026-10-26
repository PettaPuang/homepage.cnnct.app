export const PINTU_LOGIN_FAILURE_LIMIT = 5;
export const PINTU_LOGIN_LOCK_MS = 15 * 60 * 1000;

export type PintuLoginAccount = {
  failedLoginCount: number;
  lockedUntil: Date | null;
  active: boolean;
};

export type PintuLoginDecision =
  | { result: "accept" }
  | {
      result: "reject";
      failedLoginCount: number;
      lockedUntil: Date | null;
      persist: boolean;
    };

export function decideLogin(input: {
  account: PintuLoginAccount | null;
  passwordOk: boolean;
  now: Date;
}): PintuLoginDecision {
  const { account, passwordOk, now } = input;

  if (!account) {
    return {
      result: "reject",
      failedLoginCount: 0,
      lockedUntil: null,
      persist: false,
    };
  }

  const locked = isLocked(account.lockedUntil, now);
  if (!passwordOk) {
    if (locked) {
      return {
        result: "reject",
        failedLoginCount: account.failedLoginCount,
        lockedUntil: account.lockedUntil,
        persist: false,
      };
    }

    const base = lockExpired(account.lockedUntil, now) ? 0 : account.failedLoginCount;
    const failedLoginCount = base + 1;
    const lockedUntil =
      failedLoginCount >= PINTU_LOGIN_FAILURE_LIMIT
        ? new Date(now.getTime() + PINTU_LOGIN_LOCK_MS)
        : null;

    return {
      result: "reject",
      failedLoginCount,
      lockedUntil,
      persist: true,
    };
  }

  if (locked || !account.active) {
    return {
      result: "reject",
      failedLoginCount: account.failedLoginCount,
      lockedUntil: account.lockedUntil,
      persist: false,
    };
  }

  return { result: "accept" };
}

export function activeLockLabel(lockedUntil: Date | null): string | null {
  if (!lockedUntil || lockedUntil.getTime() <= Date.now()) {
    return null;
  }

  return lockedUntil.toLocaleString("id-ID");
}

function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

function lockExpired(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() <= now.getTime();
}
