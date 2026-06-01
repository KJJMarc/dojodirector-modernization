"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  createBeltSystemAction,
  createBeltSystemLevelAction,
} from "@/app/admin/[clubSlug]/belt-management/actions";
import { RECURRING_ACTION_BUTTON_CLASS } from "@/components/admin/recurring-class-action-styles";
import {
  BELT_TIME_UNITS,
  clubBeltManagementAdminPath,
  formatBeltTimeLabel,
  type AdminBeltSystem,
  type BeltSystemLevelRow,
} from "@/lib/admin-belt-systems.shared";

const TEXT_INPUT_CLASS =
  "min-h-[36px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60";

const TAB_BUTTON_ACTIVE = "border-dojo-red bg-dojo-red text-dojo-white";
const TAB_BUTTON_INACTIVE =
  "border-dojo-border bg-dojo-elevated text-dojo-white hover:border-dojo-red/50";

interface BeltSystemManagerViewProps {
  clubSlug: string;
  systems: AdminBeltSystem[];
}

function RequirementsTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-dojo-border">
      <table className="w-full min-w-[760px] text-left text-sm">{children}</table>
    </div>
  );
}

function BeltSystemLevelsTable({
  clubSlug,
  rows,
}: {
  clubSlug: string;
  rows: BeltSystemLevelRow[];
}) {
  return (
    <RequirementsTable>
      <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
        <tr>
          <th className="px-4 py-3 font-semibold">Belt / rank</th>
          <th className="px-4 py-3 font-semibold">Order</th>
          <th className="px-4 py-3 font-semibold">Required attendance</th>
          <th className="px-4 py-3 font-semibold">Required time</th>
          <th className="px-4 py-3 font-semibold">Next belt</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-dojo-border bg-dojo-surface">
        {rows.map((row) => (
          <tr key={row.requirementId} className={row.isActive ? "" : "opacity-60"}>
            <td className="px-4 py-3 font-medium text-dojo-white">
              <div>{row.name}</div>
              {row.colour ? (
                <div className="mt-1 text-xs text-dojo-muted">{row.colour}</div>
              ) : null}
            </td>
            <td className="px-4 py-3 tabular-nums text-dojo-white">{row.sortOrder}</td>
            <td className="px-4 py-3 tabular-nums text-dojo-white">
              {row.requiredAttendance}
            </td>
            <td className="px-4 py-3 text-dojo-white">
              {formatBeltTimeLabel(row.requiredTimeValue, row.requiredTimeUnit)}
            </td>
            <td className="px-4 py-3 text-dojo-muted">{row.nextBeltLabel ?? "—"}</td>
            <td className="px-4 py-3">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  row.isActive
                    ? "bg-green-500/15 text-green-400"
                    : "bg-dojo-muted/20 text-dojo-muted"
                }`}
              >
                {row.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3">
              <Link
                href={clubBeltManagementAdminPath(clubSlug, row.beltLevelId)}
                className={RECURRING_ACTION_BUTTON_CLASS}
              >
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </RequirementsTable>
  );
}

function AddBeltForm({
  clubSlug,
  system,
  onCancel,
}: {
  clubSlug: string;
  system: AdminBeltSystem;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextSortOrder = useMemo(() => {
    const maxOrder = system.levels.reduce(
      (max, level) => Math.max(max, level.sortOrder),
      0,
    );
    return maxOrder + 1;
  }, [system.levels]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("clubSlug", clubSlug);
    formData.set("beltSystemId", system.id);

    startTransition(async () => {
      try {
        await createBeltSystemLevelAction(formData);
        onCancel();
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to add belt.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4"
    >
      <h3 className="text-sm font-semibold text-dojo-white">Add New Belt</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-dojo-muted">
          Belt name
          <input name="name" required className={TEXT_INPUT_CLASS} />
        </label>
        <label className="space-y-1 text-xs text-dojo-muted">
          Display order
          <input
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={nextSortOrder}
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
            defaultValue={system.legacyCategory === "junior" ? 4 : 40}
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
            defaultValue={system.legacyCategory === "junior" ? 5 : 12}
            required
            className={TEXT_INPUT_CLASS}
          />
        </label>
        {system.legacyCategory !== "junior" ? (
          <label className="space-y-1 text-xs text-dojo-muted">
            Required time unit
            <select
              name="requiredTimeUnit"
              defaultValue={system.defaultTimeUnit}
              className={TEXT_INPUT_CLASS}
            >
              {BELT_TIME_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="requiredTimeUnit" value="weeks" />
        )}
        <label className="space-y-1 text-xs text-dojo-muted">
          Colour (optional)
          <input name="colour" className={TEXT_INPUT_CLASS} placeholder="e.g. blue" />
        </label>
        <label className="flex items-center gap-2 self-end text-xs text-dojo-muted">
          <input type="checkbox" name="isActive" defaultChecked className="size-4" />
          Active
        </label>
      </div>
      {error ? <p className="text-xs text-dojo-red">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
          {isPending ? "Adding…" : "Add belt"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className={SECONDARY_BUTTON_CLASS}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddBeltSystemForm({
  clubSlug,
  onCancel,
}: {
  clubSlug: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("clubSlug", clubSlug);

    startTransition(async () => {
      try {
        await createBeltSystemAction(formData);
        onCancel();
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to create belt system.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4"
    >
      <h3 className="text-sm font-semibold text-dojo-white">Add New Belt System</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-dojo-muted sm:col-span-2">
          Belt system name
          <input
            name="name"
            required
            className={TEXT_INPUT_CLASS}
            placeholder="e.g. Muay Thai Grades"
          />
        </label>
        <label className="space-y-1 text-xs text-dojo-muted sm:col-span-2">
          Description
          <input
            name="description"
            className={TEXT_INPUT_CLASS}
            placeholder="Optional description"
          />
        </label>
        <label className="space-y-1 text-xs text-dojo-muted">
          Default time unit
          <select name="defaultTimeUnit" defaultValue="months" className={TEXT_INPUT_CLASS}>
            {BELT_TIME_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-xs text-dojo-muted">
          <input type="checkbox" name="isActive" defaultChecked className="size-4" />
          Active
        </label>
      </div>
      {error ? <p className="text-xs text-dojo-red">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
          {isPending ? "Creating…" : "Create belt system"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className={SECONDARY_BUTTON_CLASS}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function BeltSystemManagerView({ clubSlug, systems }: BeltSystemManagerViewProps) {
  const activeSystems = systems.filter((system) => system.isActive);
  const [selectedSystemId, setSelectedSystemId] = useState(
    activeSystems[0]?.id ?? systems[0]?.id ?? "",
  );
  const [showAddBelt, setShowAddBelt] = useState(false);
  const [showAddSystem, setShowAddSystem] = useState(false);

  const selectedSystem =
    systems.find((system) => system.id === selectedSystemId) ?? systems[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {systems.map((system) => (
          <button
            key={system.id}
            type="button"
            onClick={() => {
              setSelectedSystemId(system.id);
              setShowAddBelt(false);
            }}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
              selectedSystem?.id === system.id ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
            }`}
          >
            {system.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setShowAddSystem((current) => !current);
            setShowAddBelt(false);
          }}
          className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-4 py-2 text-xs font-semibold transition ${
            showAddSystem ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE
          }`}
        >
          Add New Belt System
        </button>
      </div>

      {showAddSystem ? (
        <AddBeltSystemForm clubSlug={clubSlug} onCancel={() => setShowAddSystem(false)} />
      ) : null}

      {selectedSystem ? (
        <section aria-label={`${selectedSystem.name} belt levels`} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-dojo-white">{selectedSystem.name}</h3>
              {selectedSystem.description ? (
                <p className="mt-1 text-xs text-dojo-muted">{selectedSystem.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowAddBelt((current) => !current)}
              className={PRIMARY_BUTTON_CLASS}
            >
              Add New Belt
            </button>
          </div>

          <p className="text-xs text-dojo-muted">
            Each row shows promotion requirements for that belt. Use Edit to update belt
            details, status, and progression rules.
          </p>

          {showAddBelt ? (
            <AddBeltForm
              clubSlug={clubSlug}
              system={selectedSystem}
              onCancel={() => setShowAddBelt(false)}
            />
          ) : null}

          {selectedSystem.levels.length === 0 ? (
            <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
              No belts configured in this system yet.
            </p>
          ) : (
            <BeltSystemLevelsTable clubSlug={clubSlug} rows={selectedSystem.levels} />
          )}
        </section>
      ) : null}
    </div>
  );
}

export function BeltManagementView({
  clubSlug,
  systems,
}: {
  clubSlug: string;
  systems: AdminBeltSystem[];
}) {
  return <BeltSystemManagerView clubSlug={clubSlug} systems={systems} />;
}
