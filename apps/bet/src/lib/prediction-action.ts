"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { groups, members, predictions } from "@/db/drizzle-schema";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Groups

export async function createGroup(data: {
  name: string;
  description?: string;
}) {
  await requireAdmin();

  const [group] = await db
    .insert(groups)
    .values({
      name: data.name,
      description: data.description ?? null,
    })
    .returning();

  revalidatePath("/");
  return { group };
}

export async function updateGroup(data: {
  id: number;
  name: string;
  description?: string;
}) {
  await requireAdmin();

  await db
    .update(groups)
    .set({ name: data.name, description: data.description ?? null })
    .where(eq(groups.id, data.id));

  revalidatePath("/");
  return { success: true };
}

export async function deleteGroup(data: { id: number }) {
  await requireAdmin();

  await db.delete(groups).where(eq(groups.id, data.id));
  revalidatePath("/");
  return { success: true };
}

// Members

export async function createMember(data: { name: string; groupId: number }) {
  await requireAdmin();

  const [member] = await db
    .insert(members)
    .values({ name: data.name, groupId: data.groupId })
    .returning();

  revalidatePath("/");
  return { member };
}

export async function deleteMember(data: { id: number }) {
  await requireAdmin();

  await db.delete(members).where(eq(members.id, data.id));
  revalidatePath("/");
  return { success: true };
}

// Predictions

export async function createPrediction(data: {
  text: string;
  predictorId: number;
  groupId: number;
  madeAt?: string;
}) {
  await requireAdmin();

  const [prediction] = await db
    .insert(predictions)
    .values({
      text: data.text,
      predictorId: data.predictorId,
      groupId: data.groupId,
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
