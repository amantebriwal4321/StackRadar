import { fetchTools, fetchOverview, fetchCategories } from "@/data/trends";
import TrendsClient from "./TrendsClient";

/* Server-rendered with ISR, so the scores are in the HTML.
 *
 * Every figure this page exists to show was previously fetched in the browser,
 * meaning a sleeping backend left it empty and search engines saw nothing but
 * a shell. Cached here, the ranking renders instantly from the last good
 * reading and the staleness indicator says how old it is.
 */
export const revalidate = 1800;

export default async function TrendsPage() {
  const [tools, overview, categories] = await Promise.all([
    fetchTools().catch(() => []),
    fetchOverview().catch(() => null),
    fetchCategories().catch(() => []),
  ]);
  return <TrendsClient tools={tools} overview={overview} categories={categories} />;
}
