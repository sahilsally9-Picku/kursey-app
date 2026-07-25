// Server-only helpers. Never import this from a page or component —
// it carries the service key, which must stay on the server.
import { createClient } from "@supabase/supabase-js";

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Pull the logged-in user out of the request's Authorization header.
export async function getCaller(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function isPlatformAdmin(userId) {
  const { data } = await admin
    .from("platform_admins").select("user_id").eq("user_id", userId).limit(1).maybeSingle();
  return !!data;
}

// The main gate: is the caller logged in AND the owner of this shop?
// Returns { shop, user } on success, or { error, status } to send straight back.
export async function requireShopOwner(request, shopId) {
  if (!shopId) return { error: "Missing shop", status: 400 };
  const user = await getCaller(request);
  if (!user) return { error: "Please log in and try again.", status: 401 };

  const { data: shop } = await admin.from("shops").select("*").eq("id", shopId).single();
  if (!shop) return { error: "Shop not found", status: 404 };

  if (shop.owner_id !== user.id && !(await isPlatformAdmin(user.id))) {
    return { error: "You don't have access to this shop.", status: 403 };
  }
  return { user, shop };
}