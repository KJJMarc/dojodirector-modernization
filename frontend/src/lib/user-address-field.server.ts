import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseErrorLike = { code?: string; message?: string } | null;

const USERS_ADDRESS_COLUMN = "address";

let usersAddressColumnAvailable: boolean | null = null;

function isMissingUsersAddressColumnError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist"))
  ) {
    return message.includes(USERS_ADDRESS_COLUMN);
  }

  return false;
}

/** Whether public.users has a text address column we can read/write. */
export async function canPersistUserAddressOnUsers(): Promise<boolean> {
  if (usersAddressColumnAvailable !== null) {
    return usersAddressColumnAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .select(USERS_ADDRESS_COLUMN)
    .limit(0);

  if (isMissingUsersAddressColumnError(error)) {
    usersAddressColumnAvailable = false;
    return false;
  }

  usersAddressColumnAvailable = !error;
  return usersAddressColumnAvailable;
}

export async function loadUserAddressFromUsers(userId: string): Promise<string> {
  if (!(await canPersistUserAddressOnUsers())) {
    return "";
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USERS_ADDRESS_COLUMN)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingUsersAddressColumnError(error)) {
      usersAddressColumnAvailable = false;
      return "";
    }

    throw new Error(`Failed to load address: ${error.message}`);
  }

  const value = (data as { address?: string | null } | null)?.address;
  return typeof value === "string" ? value.trim() : "";
}

export async function saveUserAddressOnUsers(
  userId: string,
  address: string | null,
): Promise<void> {
  if (!(await canPersistUserAddressOnUsers())) {
    return;
  }

  const trimmed = address?.trim() ?? "";
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ [USERS_ADDRESS_COLUMN]: trimmed || null })
    .eq("id", userId);

  if (error) {
    if (isMissingUsersAddressColumnError(error)) {
      usersAddressColumnAvailable = false;
      return;
    }

    throw new Error(`Unable to save address: ${error.message}`);
  }
}
