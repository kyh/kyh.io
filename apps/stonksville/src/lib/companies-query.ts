import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db/drizzle-client";
import { company } from "@/db/drizzle-schema";

export type CompanyPickerItem = {
  id: string;
  ticker: string | null;
  name: string;
  sector: string;
};

export async function getAllCompanies(): Promise<CompanyPickerItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  return db
    .select({
      id: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
    })
    .from(company)
    .orderBy(company.name);
}
