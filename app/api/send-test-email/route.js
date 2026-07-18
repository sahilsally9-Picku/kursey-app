import { Resend } from "resend";

export async function POST(request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { to } = await request.json();
    if (!to) return Response.json({ error: "Missing 'to' email" }, { status: 400 });

    const { data, error } = await resend.emails.send({
      from: "Kursey <onboarding@resend.dev>",
      to: [to],
      subject: "Test reminder from Kursey",
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color:#059669;">Kursey</h2>
          <p>This is a test reminder email. If you're reading this, email sending works! 🎉</p>
        </div>
      `,
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}