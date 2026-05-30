import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditClassSessionForm } from "@/components/admin/edit-class-session-form";
import { AppHeader } from "@/components/layout/app-header";
import { getEditableClassSession } from "@/lib/admin-class-sessions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Edit session",
  description: "Edit a class session for Kingston Jiu Jitsu.",
};

interface EditClassSessionPageProps {
  params: { sessionId: string };
}

export default async function EditClassSessionPage({
  params,
}: EditClassSessionPageProps) {
  let session;

  try {
    session = await getEditableClassSession(params.sessionId);
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit session" />

      <Link
        href="/admin/classes"
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to classes
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Session details
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Update date, time, capacity, location, programme type or status.
          </p>
        </div>

        <EditClassSessionForm session={session} />
      </section>
    </main>
  );
}
