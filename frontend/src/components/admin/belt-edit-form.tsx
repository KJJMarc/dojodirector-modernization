"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  deleteBeltSystemLevelAction,
  saveBeltLevelDetailsAction,
  setBeltSystemLevelActiveAction,
} from "@/app/admin/[clubSlug]/belt-management/actions";
import {
  BELT_DELETE_BLOCKED_MESSAGE,
  BELT_TIME_UNITS,
  clubBeltManagementAdminPath,
  type BeltLevelEditPageData,
} from "@/lib/admin-belt-systems.shared";

const TEXT_INPUT_CLASS =
  "min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

const DANGER_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-50";

interface BeltEditFormProps {
  clubSlug: string;
  belt: BeltLevelEditPageData;
}

export function BeltEditForm({ clubSlug, belt }: BeltEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("clubSlug", clubSlug);
    formData.set("beltLevelId", belt.beltLevelId);
    formData.set("beltSystemId", belt.beltSystemId);
    formData.set("requirementId", belt.requirementId);

    startTransition(async () => {
      try {
        await saveBeltLevelDetailsAction(formData);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save changes.");
      }
    });
  };

  const handleToggleActive = () => {
    setError(null);
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("beltLevelId", belt.beltLevelId);
    formData.set("isActive", belt.isActive ? "false" : "true");

    startTransition(async () => {
      try {
        await setBeltSystemLevelActiveAction(formData);
        router.refresh();
      } catch (toggleError) {
        setError(
          toggleError instanceof Error ? toggleError.message : "Unable to update belt status.",
        );
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("beltLevelId", belt.beltLevelId);

    startTransition(async () => {
      try {
        await deleteBeltSystemLevelAction(formData);
        router.push(clubBeltManagementAdminPath(clubSlug));
        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error ? deleteError.message : "Unable to delete this belt.",
        );
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-dojo-muted sm:col-span-2">
            Belt name
            <input
              name="name"
              defaultValue={belt.name}
              required
              className={TEXT_INPUT_CLASS}
            />
          </label>

          <div className="space-y-1 text-xs text-dojo-muted">
            Belt system
            <p className="min-h-[40px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-sm text-dojo-white">
              {belt.beltSystemName}
            </p>
          </div>

          <label className="space-y-1 text-xs text-dojo-muted">
            Display order
            <input
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              defaultValue={belt.sortOrder}
              required
              className={TEXT_INPUT_CLASS}
            />
          </label>

          <label className="space-y-1 text-xs text-dojo-muted">
            Required attendance
            <input
              name="requiredAttendance"
              type="number"
              min={1}
              step={1}
              defaultValue={belt.requiredAttendance}
              required
              className={TEXT_INPUT_CLASS}
            />
          </label>

          <label className="space-y-1 text-xs text-dojo-muted">
            Required time
            <input
              name="requiredTimeValue"
              type="number"
              min={1}
              step={1}
              defaultValue={belt.requiredTimeValue}
              required
              className={TEXT_INPUT_CLASS}
            />
          </label>

          {belt.legacyCategory === "junior" ? (
            <div className="space-y-1 text-xs text-dojo-muted">
              Required time unit
              <p className="min-h-[40px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-sm text-dojo-white">
                weeks
              </p>
              <input type="hidden" name="requiredTimeUnit" value="weeks" />
            </div>
          ) : (
            <label className="space-y-1 text-xs text-dojo-muted">
              Required time unit
              <select
                name="requiredTimeUnit"
                defaultValue={belt.requiredTimeUnit}
                className={TEXT_INPUT_CLASS}
              >
                {BELT_TIME_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1 text-xs text-dojo-muted">
            Colour (optional)
            <input
              name="colour"
              defaultValue={belt.colour ?? ""}
              className={TEXT_INPUT_CLASS}
              placeholder="e.g. blue"
            />
          </label>

          <div className="space-y-1 text-xs text-dojo-muted">
            Status
            <p className="min-h-[40px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-sm text-dojo-white">
              {belt.isActive ? "Active" : "Inactive"}
            </p>
          </div>

          <div className="space-y-1 text-xs text-dojo-muted sm:col-span-2">
            Next belt progression
            <p className="min-h-[40px] rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-sm text-dojo-white">
              {belt.nextBeltLabel ?? "—"}
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-dojo-red">{error}</p> : null}

        <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Belt status
        </h2>
        <button
          type="button"
          disabled={isPending}
          onClick={handleToggleActive}
          className={SECONDARY_BUTTON_CLASS}
        >
          {belt.isActive ? "Mark Inactive" : "Reactivate"}
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Delete belt
        </h2>

        {!belt.canDelete ? (
          <p className="text-sm text-dojo-muted">
            {belt.deleteBlockedReason ?? BELT_DELETE_BLOCKED_MESSAGE}
          </p>
        ) : showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-dojo-white">
              Delete <span className="font-semibold">{belt.name}</span>? This cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className={DANGER_BUTTON_CLASS}
              >
                {isPending ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowDeleteConfirm(false)}
                className={SECONDARY_BUTTON_CLASS}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowDeleteConfirm(true)}
            className={DANGER_BUTTON_CLASS}
          >
            Delete Belt
          </button>
        )}
      </section>

      <Link
        href={clubBeltManagementAdminPath(clubSlug)}
        className="inline-flex text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Belt Management
      </Link>
    </div>
  );
}
