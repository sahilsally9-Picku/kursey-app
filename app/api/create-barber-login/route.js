import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const { staffId, shopId, email, password } = await request.json();
    if (!staffId || !shopId || !email || !password) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // make sure this staff belongs to this shop
    const { data: staff } = await supabase.from("staff").select("*").eq("id", staffId).eq("shop_id", shopId).single();
    if (!staff) return Response.json({ error: "Barber not found" }, { status: 404 });

    // create the auth user (confirmed, so they can log in right away)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (createErr) return Response.json({ error: createErr.message }, { status: 400 });

    // link the login to this barber
    const { error: updErr } = await supabase.from("staff")
      .update({ user_id: created.user.id, login_email: email.trim().toLowerCase() })
      .eq("id", staffId);
    if (updErr) return Response.json({ error: updErr.message }, { status: 400 });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}