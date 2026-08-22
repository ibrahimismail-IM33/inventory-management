import Link from "next/link";
import { signIn, signUp } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { error, mode } = await searchParams;
  const isSignup = mode === "signup";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WAQT</h1>
        <p className="mt-1 text-sm opacity-70">
          Expiry tracking &amp; supplier returns for supermarkets.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <form action={isSignup ? signUp : signIn} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2"
          />
        </label>

        <SubmitButton
          pendingText={isSignup ? "Creating account…" : "Signing in…"}
          className="mt-2 rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
        >
          {isSignup ? "Create account" : "Sign in"}
        </SubmitButton>
      </form>

      <p className="text-sm opacity-70">
        {isSignup ? "Already have an account? " : "New to WAQT? "}
        <Link
          href={isSignup ? "/login" : "/login?mode=signup"}
          className="font-medium text-teal-700 underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
