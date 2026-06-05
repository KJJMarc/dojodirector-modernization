/** Must match Supabase Auth → Email OTP Expiration (max 86400 seconds). */
export const PORTAL_AUTH_LINK_VALIDITY_HOURS = 24;

export const PORTAL_AUTH_LINK_VALIDITY_SECONDS = PORTAL_AUTH_LINK_VALIDITY_HOURS * 60 * 60;

export const PORTAL_AUTH_LINK_VALIDITY_LABEL = `${PORTAL_AUTH_LINK_VALIDITY_HOURS} hours`;

export function portalAuthLinkExpiryEmailLine() {
  return `This link expires ${PORTAL_AUTH_LINK_VALIDITY_LABEL} after it is sent for your security.`;
}
