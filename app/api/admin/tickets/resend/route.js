import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendTicketsEmail } from "@/lib/email";
import { createTicketResendHandler } from "@/lib/admin-ticket-resend.mjs";
export const POST = createTicketResendHandler({ db: prisma, getAdmin: requireAdmin, sendEmail: sendTicketsEmail });
