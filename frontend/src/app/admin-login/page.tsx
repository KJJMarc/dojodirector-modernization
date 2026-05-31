import { redirect } from "next/navigation";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { adminAccessPath } from "@/lib/admin-auth.shared";

export default function AdminLoginRedirectPage() {
  redirect(adminAccessPath(KINGSTON_CLUB_SLUG));
}
