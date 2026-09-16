import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createDeleteHandler } from "./delete-event.mjs";

export function eventDeletionHandler(kind) {
  return createDeleteHandler({
    db: prisma,
    getAdmin: requireAdmin,
    invalidate: () => revalidatePath("/", "layout"),
  }, kind);
}
