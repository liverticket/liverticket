import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminTickets from "./AdminTickets";
export default async function AdminTicketsPage() {
  if (!await requireAdmin()) redirect("/ingresar");
  return <AdminTickets />;
}
