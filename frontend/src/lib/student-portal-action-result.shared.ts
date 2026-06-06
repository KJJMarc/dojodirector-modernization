import type { StudentPortalBookableSession } from "@/lib/student-portal.shared";

export interface StudentPortalActionResult {
  className: string;
}

const DEFAULT_CLASS_NAME = "this class";

export function resolveStudentPortalActionClassName(
  result: unknown,
  fallback = DEFAULT_CLASS_NAME,
): string {
  if (result && typeof result === "object" && "className" in result) {
    const className = (result as { className?: unknown }).className;

    if (typeof className === "string" && className.trim()) {
      return className.trim();
    }
  }

  return fallback;
}

export function formatStudentPortalActionSuccessMessage(
  template: string,
  result: unknown,
  fallbackClassName = DEFAULT_CLASS_NAME,
): string {
  if (!template.includes("[class]")) {
    return template;
  }

  return template.replace(
    "[class]",
    resolveStudentPortalActionClassName(result, fallbackClassName),
  );
}

export function toStudentPortalActionResult(
  result: unknown,
  fallbackClassName = DEFAULT_CLASS_NAME,
): StudentPortalActionResult {
  return {
    className: resolveStudentPortalActionClassName(result, fallbackClassName),
  };
}

export function isStudentPortalBookableSession(
  session: StudentPortalBookableSession | null | undefined,
): session is StudentPortalBookableSession {
  return (
    session != null &&
    typeof session.id === "string" &&
    session.id.trim().length > 0
  );
}
