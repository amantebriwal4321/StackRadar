"use client";

import { useParams } from "next/navigation";
import { redirect } from "next/navigation";

/**
 * Legacy route — redirects to the new /tools/{slug} page.
 */
export default function LegacyTechnologyPage() {
  const params = useParams();
  const name = params.name as string;
  redirect(`/tools/${name}`);
}
