import { redirect } from "next/navigation";
import { superAdminLoginPath } from "@/lib/admin-auth.shared";

export default function AdminLoginPage() {
  redirect(superAdminLoginPath());
}
