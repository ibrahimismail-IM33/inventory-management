import { createCompany } from "@/lib/actions/company";
import { SubmitButton } from "@/components/SubmitButton";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set up your company</h1>
        <p className="mt-1 text-sm opacity-70">
          We&apos;ll create your workspace and a &ldquo;Main store&rdquo; to get you started.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <form action={createCompany} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Company / supermarket name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2"
            placeholder="e.g. Kedai Runcit Maju"
          />
        </label>
        <SubmitButton pendingText="Creating…" className="mt-2 rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">
          Create workspace
        </SubmitButton>
      </form>
    </main>
  );
}
