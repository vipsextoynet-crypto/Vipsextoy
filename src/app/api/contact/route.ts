import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contact, message, company } = body as {
      name?: string;
      contact?: string;
      message?: string;
      company?: string; // honeypot: bot spam thuong dien vao truong an nay
    };

    // Bot spam thuong dien vao truong an (khong hien voi nguoi that). Neu co
    // gia tri, coi nhu spam, tra ve "thanh cong" gia de bot khong biet bi chan.
    if (company) {
      return NextResponse.json({ ok: true });
    }

    if (!name?.trim() || !contact?.trim() || !message?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Thieu thong tin bat buoc." },
        { status: 400 }
      );
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const receiver = process.env.CONTACT_RECEIVER || user;

    if (!user || !pass) {
      console.error("Thieu GMAIL_USER / GMAIL_APP_PASSWORD trong bien moi truong.");
      return NextResponse.json(
        { ok: false, error: "Server chua cau hinh gui mail." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const isEmail = /\S+@\S+\.\S+/.test(contact);

    await transporter.sendMail({
      from: `"Vipsextoy - Lien he website" <${user}>`,
      to: receiver,
      replyTo: isEmail ? contact : undefined,
      subject: `[Lien he website] ${name}`,
      text: `Ho ten: ${name}\nLien he: ${contact}\n\nNoi dung:\n${message}`,
      html: `
        <p><strong>Ho ten:</strong> ${escapeHtml(name)}</p>
        <p><strong>Lien he:</strong> ${escapeHtml(contact)}</p>
        <p><strong>Noi dung:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gui email lien he that bai:", err);
    return NextResponse.json(
      { ok: false, error: "Gui khong thanh cong, vui long thu lai." },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
