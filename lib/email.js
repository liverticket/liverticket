import nodemailer from "nodemailer";
import { generateQrDataUrl } from "./qr";

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

  const result = await transporter.sendMail({
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

  console.log("VERIFICATION_EMAIL_RESULT:", result.messageId);

  return result;
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

  const ticketsHtmlArray = await Promise.all(
    tickets.map(async (ticket) => {
      const event = ticket.event;
      const ticketType = ticket.ticketType;

      const validateUrl = `${appUrl}/api/tickets/validate/${ticket.qrToken}`;
      const qrDataUrl = await generateQrDataUrl(validateUrl);

      const eventDate = event?.date
        ? new Date(event.date).toLocaleDateString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "Fecha por confirmar";

      const eventTime = event?.eventTime || "Hora por confirmar";
      const venue = event?.venue || event?.location || "Lugar por confirmar";
      const address = [event?.address, event?.city, event?.region]
        .filter(Boolean)
        .join(", ");

      return `
        <div style="background:#111111; border-radius:22px; overflow:hidden; margin:26px 0; border:1px solid #2a2a2a;">
          <div style="background:linear-gradient(90deg,#e50914,#7a0008); padding:18px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="font-size:28px; font-weight:900; color:#ffffff; letter-spacing:-1px;">
                  <span style="color:#ffffff;">Liver</span><span style="color:#111111;">Ticket</span>
                </td>
                <td align="right" style="font-size:12px; color:#ffffff; text-transform:uppercase; font-weight:bold;">
                  Entrada digital
                </td>
              </tr>
            </table>
          </div>

          <div style="padding:22px; background:#181818;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td width="42%" valign="top" style="padding-right:18px;">
                  ${
                    event?.imageUrl
                      ? `<img src="${event.imageUrl}" alt="${event?.title || "Evento"}" style="width:100%; border-radius:16px; display:block; border:1px solid #333;" />`
                      : `<div style="height:180px; border-radius:16px; background:#2a2a2a; color:#888; text-align:center; line-height:180px;">Evento</div>`
                  }
                </td>

                <td width="58%" valign="top" style="color:#ffffff;">
                  <h2 style="margin:0 0 8px; color:#ffffff; font-size:28px; line-height:1.1;">
                    ${event?.title || "Evento"}
                  </h2>

                  <p style="margin:0 0 16px; color:#bbbbbb; font-size:14px;">
                    ${venue}
                  </p>

                  <p style="margin:6px 0; color:#999; font-size:11px; text-transform:uppercase;">Fecha</p>
                  <p style="margin:0 0 12px; color:#ffffff; font-size:15px; font-weight:bold;">${eventDate}</p>

                  <p style="margin:6px 0; color:#999; font-size:11px; text-transform:uppercase;">Hora</p>
                  <p style="margin:0 0 12px; color:#ffffff; font-size:15px; font-weight:bold;">${eventTime}</p>

                  <p style="margin:6px 0; color:#999; font-size:11px; text-transform:uppercase;">Asistente</p>
                  <p style="margin:0 0 12px; color:#ffffff; font-size:17px; font-weight:bold;">${ticket.attendeeName}</p>

                  <p style="margin:6px 0; color:#999; font-size:11px; text-transform:uppercase;">Documento</p>
                  <p style="margin:0 0 12px; color:#ffffff; font-size:15px; font-weight:bold;">
                    ${ticket.attendeeDocumentType}: ${ticket.attendeeDocumentNumber}
                  </p>

                  <p style="margin:6px 0; color:#999; font-size:11px; text-transform:uppercase;">Entrada</p>
                  <p style="margin:0; color:#ffffff; font-size:15px; font-weight:bold;">
                    ${ticketType?.name || "General"} · $${Number(ticket.pricePaid || 0).toLocaleString("es-CL")}
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#f5f5f5; padding:20px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td valign="middle" style="width:150px;">
                  <img src="${qrDataUrl}" alt="QR Ticket" style="width:145px; height:145px; display:block; border-radius:8px;" />
                </td>

                <td valign="middle" style="padding-left:20px;">
                  <p style="margin:0 0 8px; color:#111; font-size:12px; text-transform:uppercase; font-weight:bold;">
                    Código Ticket
                  </p>
                  <p style="margin:0 0 12px; color:#111; font-size:17px; font-weight:bold;">
                    ${ticket.code}
                  </p>

                  <p style="margin:0 0 8px; color:#111; font-size:12px; text-transform:uppercase; font-weight:bold;">
                    Compra
                  </p>
                  <p style="margin:0 0 12px; color:#111; font-size:15px;">
                    ${order.buyOrder}
                  </p>

                  <p style="margin:0; color:#666; font-size:13px; line-height:1.4;">
                    Presenta este QR en el ingreso del evento. Esta entrada es única y será validada al escanearla.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          ${
            address
              ? `<div style="background:#ffffff; padding:14px 22px; color:#555; font-size:13px; border-top:1px solid #eee;">
                  ${address}
                </div>`
              : ""
          }
        </div>
      `;
    })
  );

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Tus entradas para ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#eeeeee; padding:24px;">
        <div style="max-width:760px; margin:0 auto;">
          <div style="background:#ffffff; border-radius:20px; padding:26px; border:1px solid #e5e5e5;">
            <h1 style="margin:0 0 10px; color:#111; font-size:34px; letter-spacing:-1px;">
              Compra confirmada
            </h1>

            <p style="font-size:16px; color:#444; margin:0 0 18px;">
              Hola, recibiste tus entradas desde <strong>LiverTicket</strong>.
            </p>

            <p style="font-size:14px; color:#555; margin:0;">
              <strong>N° compra:</strong> ${order.buyOrder}<br/>
              <strong>Total:</strong> $${Number(order.amount || 0).toLocaleString("es-CL")}
            </p>

            ${ticketsHtmlArray.join("")}

            <div style="text-align:center; margin-top:22px;">
              <a href="${accessUrl}" style="display:inline-block; background:#e50914; color:#ffffff; padding:14px 24px; border-radius:12px; text-decoration:none; font-weight:bold;">
                Ver mis tickets
              </a>
            </div>

            <p style="font-size:12px; color:#777; text-align:center; margin-top:22px;">
              LiverTicket · Entrada digital enviada automáticamente.
            </p>
          </div>
        </div>
      </div>
    `,
  });

  console.log("EMAIL_RESULT:", result.messageId);
  console.log("EMAIL_ACCEPTED:", result.accepted);
  console.log("EMAIL_REJECTED:", result.rejected);

  return result;
}