"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { predictions } from "@/db/drizzle-schema";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Predictions

export async function createPrediction(data: {
  quote: string;
  description?: string;
  background?: string;
  userId: string;
  source?: string;
  madeAt?: string;
}) {
  await requireAdmin();

  const [prediction] = await db
    .insert(predictions)
    .values({
      quote: data.quote,
      description: data.description ?? null,
      background: data.background ?? null,
      userId: data.userId,
      source: data.source ?? null,
      madeAt: data.madeAt ? new Date(data.madeAt) : new Date(),
    })
    .returning();

  revalidatePath("/");
  return { prediction };
}

export async function resolvePrediction(data: {
  id: number;
  status: "correct" | "wrong";
}) {
  await requireAdmin();

  await db
    .update(predictions)
    .set({ status: data.status, resolvedAt: new Date() })
    .where(eq(predictions.id, data.id));

  revalidatePath("/");
  return { success: true };
}

export async function unresolve(data: { id: number }) {
  await requireAdmin();

  await db
    .update(predictions)
    .set({ status: "pending", resolvedAt: null })
    .where(eq(predictions.id, data.id));

  revalidatePath("/");
  return { success: true };
}

export async function deletePrediction(data: { id: number }) {
  await requireAdmin();

  await db.delete(predictions).where(eq(predictions.id, data.id));
  revalidatePath("/");
  return { success: true };
}
