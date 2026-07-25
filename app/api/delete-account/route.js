import { NextResponse } from "next/server";
import { admin, getCaller, isPlatformAdmin } from "../../../lib/auth";

export async function POST(req) {
  try {
    // You must be logged in, and you can only delete your own account
    // (platform admins may delete someone else's).
    const caller = await getCaller(req);
    if (!caller) return NextResponse.json({ error: "Please log in and try again." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let targetId = caller.id;
    if (body.userId && body.userId !== caller.id) {
      if (!(await isPlatformAdmin(caller.id))) {
        return NextResponse.json({ error: "You can only delete your own account." }, { status: 403 });
      }
      targetId = body.userId;
    }

    const { data: shop } = await admin
      .from("shops").select("id").eq("owner_id", targetId).limit(1).single();

    if (shop) {
      const sid = shop.id;
      await admin.from("bookings").delete().eq("shop_id", sid);
      await admin.from("reviews").delete().eq("shop_id", sid);
      await admin.from("customer_profiles").delete().eq("shop_id", sid);
      await admin.from("marketing_optouts").delete().eq("shop_id", sid);
      await admin.from("services").delete().eq("shop_id", sid);
      await admin.from("staff").delete().eq("shop_id", sid);
      await admin.from("shops").delete().eq("id", sid);
    }

    const { error: authErr } = await admin.auth.admin.deleteUser(targetId);
    if (authErr) {
      return NextResponse.json({ error: "Data removed, but couldn't delete login: " + authErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}