import "server-only";
import { getCurrentUser } from "@/lib/auth";

/** For route handlers that must answer 401/403 instead of redirecting. */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}
