import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendVerificationEmail({ to, name, token }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const transporter = getTransporter();

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
            Para completar el registro en <strong>LiverTicket</strong>, confirma tu correo electrónico.
          </p>
          <a href="${verifyUrl}" style="display:inline-block; margin-top:20px; background:#e50914; color:#ffffff; padding:14px 22px; border-radius:10px; text-decoration:none; font-weight:bold;">
            Verificar y activar mi cuenta
          </a>
          <p style="font-size:13px; color:#777; margin-top:24px;">
            Este enlace estará disponible por 24 horas.
          </p>
          <p style="font-size:13px; color:#555; word-break:break-all;">
            ${verifyUrl}
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendTicketsEmail({ to, order, tickets }) {
  if (!to) {
    throw new Error("No hay correo destinatario para enviar las entradas.");
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const transporter = getTransporter();

  const eventName = tickets?.[0]?.event?.title || "Tu evento";
  const accessUrl = order.accessToken
    ? `${appUrl}/mis-tickets?accessToken=${order.accessToken}`
    : `${appUrl}/mis-tickets`;

  const ticketsHtml = tickets
    .map((ticket) => {
      const event = ticket.event;
      const ticketType = ticket.ticketType;

      return `
        <div style="border:1px solid #e5e5e5; border-radius:14px; padding:18px; margin-bottom:16px;">
          <h2 style="margin:0 0 10px; color:#111;">${event?.title || "Evento"}</h2>
          <p style="margin:4px 0; color:#333;"><strong>Entrada:</strong> ${ticketType?.name || "General"}</p>
          <p style="margin:4px 0; color:#333;"><strong>Asistente:</strong> ${ticket.attendeeName}</p>
          <p style="margin:4px 0; color:#333;"><strong>Documento:</strong> ${ticket.attendeeDocumentType}: ${ticket.attendeeDocumentNumber}</p>
          <p style="margin:4px 0; color:#333;"><strong>Código ticket:</strong> ${ticket.code}</p>
          <p style="margin:4px 0; color:#333;"><strong>Valor:</strong> $${Number(ticket.pricePaid || 0).toLocaleString("es-CL")}</p>
        </div>
      `;
    })
    .join("");

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Tus entradas para ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f4f4f5; padding:30px;">
        <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:18px; padding:30px; border:1px solid #e5e5e5;">
          <h1 style="margin:0 0 16px; color:#111;">Compra confirmada</h1>

          <p style="font-size:16px; color:#333;">
            Tu compra en <strong>LiverTicket</strong> fue confirmada correctamente.
          </p>

          <p style="font-size:15px; color:#333;">
            <strong>N° compra:</strong> ${order.buyOrder}<br/>
            <strong>Total:</strong> $${Number(order.amount || 0).toLocaleString("es-CL")}
          </p>

          <div style="margin-top:24px;">
            ${ticketsHtml}
          </div>

          <a href="${accessUrl}" style="display:inline-block; margin-top:20px; background:#e50914; color:#ffffff; padding:14px 22px; border-radius:10px; text-decoration:none; font-weight:bold;">
            Ver mis tickets
          </a>

          <p style="font-size:13px; color:#777; margin-top:24px;">
            Presenta tus entradas desde la sección Mis Tickets.
          </p>
        </div>
      </div>
    `,
  });
}