import "server-only";

import { redirect } from "next/navigation";
import { clubAdminPath, KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export function redirectLegacyClubAdmin(
  section?: string,
  searchParams?: Record<string, string | string[] | undefined>,
): never {
  let path = clubAdminPath(KINGSTON_CLUB_SLUG, section);

  if (searchParams) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          params.append(key, entry);
        }
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();

    if (queryString) {
      path = `${path}?${queryString}`;
    }
  }

  redirect(path);
}
