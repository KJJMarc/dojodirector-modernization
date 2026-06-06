export interface PortalAuthSignInActivationInput {
  portalAuthStatus: string | null | undefined;
  instructorPortalAuthStatus: string | null | undefined;
  authUserId: string | null | undefined;
}

export interface PortalAuthSignInActivationPlan {
  promoteStudentPortal: boolean;
  promoteInstructorPortal: boolean;
}

/** Pure plan for invited → active promotion after a successful password sign-in. */
export function planPortalAuthSignInActivation(
  input: PortalAuthSignInActivationInput,
): PortalAuthSignInActivationPlan {
  const hasAuthUser = Boolean(input.authUserId?.trim());

  return {
    promoteStudentPortal: hasAuthUser && input.portalAuthStatus === "invited",
    promoteInstructorPortal:
      hasAuthUser && input.instructorPortalAuthStatus === "invited",
  };
}
