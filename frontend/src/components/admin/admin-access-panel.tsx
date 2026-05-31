import { AdminAccessSetPasswordForm } from "@/components/admin/admin-access-set-password-form";
import { adminAccessPath } from "@/lib/admin-auth.shared";
import type { AdminDashboardAccessSummary } from "@/lib/admin-student-profile.shared";

interface AdminAccessPanelProps {
  clubSlug: string;
  userId: string;
  adminAccess: AdminDashboardAccessSummary;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-dojo-white">{value}</dd>
    </div>
  );
}

export function AdminAccessPanel({
  clubSlug,
  userId,
  adminAccess,
}: AdminAccessPanelProps) {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          ADMIN DASHBOARD ACCESS
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Sign-in for the hidden admin area at{" "}
          <span className="text-dojo-white">{adminAccessPath(clubSlug)}</span>. Uses
          the profile email and Supabase auth — separate from student and instructor
          portal invite flows.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailItem label="Admin login email" value={adminAccess.loginEmail ?? "—"} />
        <DetailItem
          label="Auth login linked"
          value={adminAccess.hasAuthLogin ? "Yes" : "No"}
        />
        {adminAccess.isPlatformSuperAdmin ? (
          <DetailItem label="Platform access" value="Super admin (all clubs)" />
        ) : adminAccess.isClubAdmin ? (
          <DetailItem label="Club admin access" value="Owner or admin for this club" />
        ) : null}
      </dl>

      <div className="space-y-2 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Admin password
        </h4>
        <AdminAccessSetPasswordForm
          clubSlug={clubSlug}
          userId={userId}
          canSetPassword={adminAccess.canSetPassword}
          hasAuthLogin={adminAccess.hasAuthLogin}
          canClearAccess={adminAccess.canClearAccess}
        />
      </div>
    </section>
  );
}
