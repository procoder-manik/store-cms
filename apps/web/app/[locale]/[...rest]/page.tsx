import { notFound } from "next/navigation";

/** Sends every unknown localized URL to the not-found page. */
export default function CatchAll() {
  notFound();
}
