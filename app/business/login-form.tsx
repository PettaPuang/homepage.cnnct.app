"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");

    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
      callbackUrl: "/business",
    });

    if (!result) {
      setError("Tidak dapat masuk. Coba lagi.");
      setPending(false);
      return;
    }

    if (!result.ok) {
      setError("Email atau password salah.");
      setPending(false);
      return;
    }

    window.location.assign("/business");
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        <span className="pintu-label">Email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        <span className="pintu-label">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="pintu-error">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Memeriksa…" : "Login to your business account"}
      </button>
    </form>
  );
}
