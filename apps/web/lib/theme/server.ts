import "server-only";
import { cache } from "react";
import { getSetting } from "@/lib/data/catalog";
import { resolveAppearance, type Appearance } from "./presets";

export const getAppearance = cache(async (): Promise<Appearance> => resolveAppearance(await getSetting<Partial<Appearance>>("theme").catch(() => null)));
