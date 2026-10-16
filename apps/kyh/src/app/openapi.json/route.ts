import { buildOpenApiDocument } from "@/lib/openapi";

export const GET = () => Response.json(buildOpenApiDocument());
