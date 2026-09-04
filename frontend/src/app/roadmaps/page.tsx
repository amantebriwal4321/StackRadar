import { fetchRoadmaps } from "@/data/trends";
import RoadmapsClient from "./RoadmapsClient";

/* Server-rendered with ISR. Roadmap titles, step counts and durations are
   structural content that should never have depended on a live request. */
export const revalidate = 1800;

export default async function RoadmapsPage() {
  const roadmaps = await fetchRoadmaps().catch(() => []);
  return <RoadmapsClient roadmaps={roadmaps} />;
}
