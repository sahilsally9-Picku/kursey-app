import { supabase } from "./supabase";

// Call one of our own /api routes and prove who we are while doing it.
// Use this instead of a bare fetch() for anything that touches shop data.
export async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });

  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;
  return data;
}