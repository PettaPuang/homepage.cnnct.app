"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="pintu-button-quiet"
      type="button"
      onClick={() => signOut({ callbackUrl: "/business" })}
    >
      Keluar
    </button>
  );
}
