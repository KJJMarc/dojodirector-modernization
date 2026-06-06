"use client";

import AuthRouteError from "@/components/auth/auth-route-error";

export default function InstructorPortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthRouteError
      {...props}
      loginPath="/instructor-portal/login"
      heading="Unable to load the instructor portal"
    />
  );
}
