import { admin, requireShopOwner } from "../../../lib/auth";

export async function POST(request) {
  try {
    const { staffId, shopId, email, password } = await request.json();
    if (!staffId || !shopId || !email || !password) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // only the owner of this shop may create logins for its staff
    const gate = await requireShopOwner(request, shopId);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const { data: staff } = await admin.from("staff").select("*").eq("id", staffId).eq("shop_id", shopId).single();
    if (!staff) return Response.json({ error: "Staff member not found" }, { status: 404 });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (createErr) return Response.json({ error: createErr.message }, { status: 400 });

    const { error: updErr } = await admin.from("staff")
      .update({ user_id: created.user.id, login_email: email.trim().toLowerCase() })
      .eq("id", staffId);
    if (updErr) return Response.json({ error: updErr.message }, { status: 400 });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}