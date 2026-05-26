import nodemailer from "nodemailer";

export async function sendVerificationEmail({ to, name, token }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Verifica tu cuenta en LiverTicket",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f4f4f5; padding:30px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; padding:30px; border:1px solid #e5e5e5;">
          <h1 style="margin:0 0 16px; color:#111;">Verifica tu cuenta</h1>

          <p style="font-size:16px; color:#333;">Hola ${name},</p>

          <p style="font-size:16px; color:#333;">
            Recibimos tu solicitud para crear una cuenta en <strong>LiverTicket</strong>.
            Para completar el registro y activar tu cuenta, confirma tu correo electrónico.
          </p>

          <a href="${verifyUrl}" style="display:inline-block; margin-top:20px; background:#e50914; color:#ffffff; padding:14px 22px; border-radius:10px; text-decoration:none; font-weight:bold;">
            Verificar y activar mi cuenta
          </a>

          <p style="font-size:13px; color:#777; margin-top:24px;">
            Este enlace estará disponible por 24 horas.
          </p>

          <p style="font-size:13px; color:#777;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>

          <p style="font-size:13px; color:#555; word-break:break-all;">
            ${verifyUrl}
          </p>
        </div>
      </div>
    `,
  });
}