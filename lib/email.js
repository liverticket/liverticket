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

function dataUrlToAttachment(dataUrl, filename, cid) {
  const base64 = dataUrl.split(",")[1];

  return {
    filename,
    content: Buffer.from(base64, "base64"),
    cid,
  };
}

export async function sendVerificationEmail({ to, name, token }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const transporter = getTransporter();

  return transporter.sendMail({
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
          <p style="font-size:13px; color:#777; margin-top:24px;">Este enlace estará disponible por 24 horas.</p>
          <p style="font-size:13px; color:#555; word-break:break-all;">${verifyUrl}</p>
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
  const attachments = [];

  const ticketsHtmlArray = await Promise.all(
    tickets.map(async (ticket, index) => {
      const event = ticket.event;
      const ticketType = ticket.ticketType;

      const ticketUrl = `${appUrl}/ticket/${ticket.qrToken}`;
      const qrDataUrl = await generateQrDataUrl(ticketUrl);
      const qrCid = `ticket-qr-${ticket.id || index}@liverticket`;

      attachments.push(
        dataUrlToAttachment(qrDataUrl, `ticket-${index + 1}-qr.png`, qrCid)
      );

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

      const flyerHtml = event?.imageUrl
        ? `<img src="${event.imageUrl}" alt="${event?.title || "Evento"}" style="width:145px; max-width:145px; border-radius:8px; display:block; border:1px solid #d8d8d8;" />`
        : `<div style="width:145px; height:145px; border-radius:8px; background:#222; color:#aaa; font-size:13px; line-height:145px; text-align:center;">Evento</div>`;

      return `
        <div style="max-width:620px; width:100%; margin:18px auto 24px; background:#ffffff; border:1px solid #d9d9d9; overflow:hidden;">
          <div style="background:#e50914; padding:14px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="font-size:30px; line-height:1; font-weight:900; color:#ffffff;">
                  Liver<span style="color:#111111;">Ticket</span>
                </td>
                <td align="right" style="font-size:16px; line-height:1.15; color:#ffffff; font-weight:800; text-transform:uppercase;">
                  Entrada<br/>Digital
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#f1f1f1; padding:18px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td width="42%" valign="top" align="center" style="padding:0 10px 12px 0;">
                  ${flyerHtml}
                </td>

                <td width="58%" valign="top" align="center" style="padding:0 0 12px 10px;">
                  <img src="cid:${qrCid}" alt="QR Ticket" style="width:210px; max-width:100%; height:auto; display:block; margin:0 auto;" />
                </td>
              </tr>
            </table>

            <div style="text-align:center; padding:8px 8px 2px;">
              <h2 style="margin:0 0 8px; color:#222222; font-size:20px; line-height:1.2; font-weight:800;">
                ${event?.title || "Evento"}
              </h2>

              <p style="margin:0 0 10px; color:#555555; font-size:15px; line-height:1.35;">
                ${ticketType?.name || "Entrada General"}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Asistente
              </p>
              <p style="margin:0 0 10px; color:#333333; font-size:16px;">
                ${ticket.attendeeName}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Documento
              </p>
              <p style="margin:0 0 10px; color:#333333; font-size:15px;">
                ${ticket.attendeeDocumentType}: ${ticket.attendeeDocumentNumber}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Fecha y hora
              </p>
              <p style="margin:0 0 10px; color:#333333; font-size:15px;">
                ${eventDate} · ${eventTime}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Lugar
              </p>
              <p style="margin:0 0 10px; color:#333333; font-size:14px;">
                ${venue}${address ? `<br/>${address}` : ""}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Código Ticket
              </p>
              <p style="margin:0 0 8px; color:#333333; font-size:13px; word-break:break-all;">
                ${ticket.code}
              </p>

              <p style="margin:0 0 4px; color:#777777; font-size:12px; text-transform:uppercase; font-weight:bold;">
                Compra
              </p>
              <p style="margin:0; color:#333333; font-size:13px; word-break:break-all;">
                ${order.buyOrder}
              </p>
            </div>
          </div>

          <div style="background:#ffffff; padding:12px 16px; text-align:center; border-top:1px solid #e5e5e5;">
            <p style="margin:0; color:#666666; font-size:12px; line-height:1.4;">
              Presenta este QR en el ingreso del evento. Esta entrada es única y será validada al escanearla.
            </p>
          </div>
        </div>
      `;
    })
  );

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Tus entradas para ${eventName}`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; background:#eeeeee; padding:12px 6px;">
        <div style="max-width:660px; width:100%; margin:0 auto;">
          ${ticketsHtmlArray.join("")}
        </div>

        <p style="font-size:11px; color:#777777; text-align:center; margin:12px 8px 4px;">
          LiverTicket · Entrada digital enviada automáticamente.
        </p>
      </div>
    `,
  });

  console.log("EMAIL_RESULT:", result.messageId);
  console.log("EMAIL_ACCEPTED:", result.accepted);
  console.log("EMAIL_REJECTED:", result.rejected);

  return result;
}