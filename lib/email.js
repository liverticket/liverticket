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
  if (!to) throw new Error("No hay correo destinatario para enviar las entradas.");

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const transporter = getTransporter();

  const eventName = tickets?.[0]?.event?.title || "Tu evento";
  const accessUrl = order.accessToken
    ? `${appUrl}/mis-tickets?accessToken=${order.accessToken}`
    : `${appUrl}/mis-tickets`;

  const attachments = [];

  const ticketsHtmlArray = await Promise.all(
    tickets.map(async (ticket, index) => {
      const event = ticket.event;
      const ticketType = ticket.ticketType;

      const validateUrl = `${appUrl}/api/tickets/validate/${ticket.qrToken}`;
      const qrDataUrl = await generateQrDataUrl(validateUrl);
      const qrCid = `ticket-qr-${ticket.id || index}@liverticket`;

      attachments.push(dataUrlToAttachment(qrDataUrl, `ticket-${index + 1}-qr.png`, qrCid));

      const eventDate = event?.date
        ? new Date(event.date).toLocaleDateString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "Fecha por confirmar";

      const venue = event?.venue || event?.location || "Lugar por confirmar";
      const address = [event?.address, event?.city, event?.region].filter(Boolean).join(", ");

      return `
        <div style="max-width:430px; width:100%; margin:24px auto; background:#151515; border-radius:22px; overflow:hidden; border:1px solid #2a2a2a;">
          <div style="background:#e50914; padding:18px 20px;">
            <div style="font-size:32px; font-weight:900; color:#fff; line-height:1;">
              Liver<span style="color:#111;">Ticket</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:#fff; margin-top:6px; text-transform:uppercase;">
              Entrada digital
            </div>
          </div>

          ${
            event?.imageUrl
              ? `<img src="${event.imageUrl}" alt="${event?.title || "Evento"}" style="width:100%; display:block;" />`
              : ""
          }

          <div style="padding:24px 22px; color:#fff;">
            <h2 style="font-size:34px; line-height:1.05; margin:0 0 8px; color:#fff;">
              ${event?.title || "Evento"}
            </h2>

            <p style="font-size:18px; color:#bdbdbd; margin:0 0 22px;">
              ${venue}
            </p>

            <p style="margin:0 0 5px; color:#888; font-size:12px; text-transform:uppercase;">Fecha</p>
            <p style="margin:0 0 18px; color:#fff; font-size:20px; font-weight:bold;">${eventDate}</p>

            <p style="margin:0 0 5px; color:#888; font-size:12px; text-transform:uppercase;">Hora</p>
            <p style="margin:0 0 18px; color:#fff; font-size:20px; font-weight:bold;">
              ${event?.eventTime || "Hora por confirmar"}
            </p>

            <p style="margin:0 0 5px; color:#888; font-size:12px; text-transform:uppercase;">Asistente</p>
            <p style="margin:0 0 18px; color:#fff; font-size:21px; font-weight:bold;">
              ${ticket.attendeeName}
            </p>

            <p style="margin:0 0 5px; color:#888; font-size:12px; text-transform:uppercase;">Documento</p>
            <p style="margin:0 0 18px; color:#fff; font-size:18px; font-weight:bold;">
              ${ticket.attendeeDocumentType}: ${ticket.attendeeDocumentNumber}
            </p>

            <p style="margin:0 0 5px; color:#888; font-size:12px; text-transform:uppercase;">Entrada</p>
            <p style="margin:0; color:#fff; font-size:19px; font-weight:bold;">
              ${ticketType?.name || "General"} · $${Number(ticket.pricePaid || 0).toLocaleString("es-CL")}
            </p>
          </div>

          <div style="background:#f4f4f4; padding:24px 22px; text-align:center;">
            <img src="cid:${qrCid}" alt="QR Ticket" style="width:230px; max-width:80%; height:auto; display:block; margin:0 auto 18px;" />

            <p style="margin:0 0 6px; color:#111; font-size:12px; text-transform:uppercase; font-weight:bold;">
              Código Ticket
            </p>
            <p style="margin:0 0 16px; color:#111; font-size:18px; font-weight:bold; word-break:break-all;">
              ${ticket.code}
            </p>

            <p style="margin:0 0 6px; color:#111; font-size:12px; text-transform:uppercase; font-weight:bold;">
              Compra
            </p>
            <p style="margin:0 0 16px; color:#333; font-size:15px; word-break:break-all;">
              ${order.buyOrder}
            </p>

            <p style="margin:0; color:#666; font-size:13px; line-height:1.45;">
              Presenta este QR en el ingreso del evento. Esta entrada es única y será validada al escanearla.
            </p>
          </div>

          ${
            address
              ? `<div style="background:#ffffff; padding:14px 18px; color:#555; font-size:13px; text-align:center;">
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
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; background:#eeeeee; padding:18px 10px;">
        <div style="max-width:520px; width:100%; margin:0 auto; background:#ffffff; border-radius:20px; padding:20px 10px; border:1px solid #e5e5e5;">
          <h1 style="margin:0 14px 8px; color:#111; font-size:28px;">
            Compra confirmada
          </h1>

          <p style="font-size:15px; color:#444; margin:0 14px 14px;">
            Recibiste tus entradas desde <strong>LiverTicket</strong>.
          </p>

          <p style="font-size:13px; color:#555; margin:0 14px 8px;">
            <strong>N° compra:</strong> ${order.buyOrder}<br/>
            <strong>Total:</strong> $${Number(order.amount || 0).toLocaleString("es-CL")}
          </p>

          ${ticketsHtmlArray.join("")}

          <div style="text-align:center; margin:22px 0;">
            <a href="${accessUrl}" style="display:inline-block; background:#e50914; color:#ffffff; padding:14px 24px; border-radius:12px; text-decoration:none; font-weight:bold;">
              Ver mis tickets
            </a>
          </div>

          <p style="font-size:12px; color:#777; text-align:center; margin:18px 10px 4px;">
            LiverTicket · Entrada digital enviada automáticamente.
          </p>
        </div>
      </div>
    `,
  });

  console.log("EMAIL_RESULT:", result.messageId);
  console.log("EMAIL_ACCEPTED:", result.accepted);
  console.log("EMAIL_REJECTED:", result.rejected);

  return result;
}