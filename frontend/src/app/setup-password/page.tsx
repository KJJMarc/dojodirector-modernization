import { redirect } from "next/navigation";
import {
  buildPortalSetupResetPath,
  parsePortalSetupLoginContext,
} from "@/lib/portal-setup.shared";

export const dynamic = "force-dynamic";

interface SetupPasswordPageProps {
  searchParams: {
    context?: string;
    error?: string;
    token_hash?: string;
    type?: string;
  };
}

export default function SetupPasswordPage({ searchParams }: SetupPasswordPageProps) {
  const context = parsePortalSetupLoginContext(searchParams.context);
  const resetPath = context
    ? buildPortalSetupResetPath(context)
    : "/reset-password?setup=1";

  if (searchParams.token_hash && searchParams.type === "recovery") {
    const params = new URLSearchParams();
    params.set("token_hash", searchParams.token_hash);
    params.set("type", searchParams.type);
    params.set("next", resetPath);

    redirect(`/auth/confirm?${params.toString()}`);
  }

  const params = new URLSearchParams();
  params.set("setup", "1");

  if (context) {
    params.set("context", context);
  }

  if (searchParams.error) {
    params.set("error", searchParams.error);
  }

  redirect(`/reset-password?${params.toString()}`);
}
