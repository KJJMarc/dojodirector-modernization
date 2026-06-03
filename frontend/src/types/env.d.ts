declare namespace NodeJS {
  interface ProcessEnv {
    /** Resend API key (server-only). Set in frontend/.env.local */
    RESEND_API_KEY?: string;
    /** Verified sender address for Resend (server-only). Set in frontend/.env.local */
    RESEND_FROM_EMAIL?: string;
  }
}
