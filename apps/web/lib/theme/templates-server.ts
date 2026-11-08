import "server-only";
import { cache } from "react";
import { getSetting } from "@/lib/data/catalog";
import { resolveTemplates, type Templates } from "./templates";

export const getTemplates = cache(async (): Promise<Templates> => resolveTemplates(await getSetting("templates").catch(() => null)));
