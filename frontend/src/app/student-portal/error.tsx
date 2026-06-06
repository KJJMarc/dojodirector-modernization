"use client";

import AuthRouteError from "@/components/auth/auth-route-error";

export default function StudentPortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthRouteError
      {...props}
      loginPath="/student-portal/login"
      heading="Unable to load the student portal"
    />
  );
}
