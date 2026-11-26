import { readFileSync } from "node:fs";
import { z } from "zod";

export const skillLockSchema = z.object({
  skills: z.record(z.string(), z.object({ source: z.string().optional() })).default({}),
});

export const externalSkillsSchema = z.object({
  skills: z.record(z.string(), z.array(z.string())).default({}),
  unmanaged: z.array(z.string()).default([]),
});

export const stateSchema = z.object({
  claudeMd: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
});

export const packageBinSchema = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
});

export const mcpSchema = z.object({
  mcpServers: z.record(z.string(), z.unknown()).default({}),
});

export const claudeConfigSchema = z.looseObject({
  mcpServers: z.record(z.string(), z.unknown()).optional(),
});

export const readJson = <S extends z.ZodType>(file: string, schema: S) =>
  schema.parse(JSON.parse(readFileSync(file, "utf-8")));

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
