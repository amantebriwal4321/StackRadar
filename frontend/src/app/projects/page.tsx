import { fetchProjects } from "@/data/trends";
import ProjectsClient from "./ProjectsClient";

/* Server-rendered, so the briefs are in the HTML.
 *
 * This page benefits most of all: project briefs are hand-authored static
 * content that never needed a live backend to be readable, yet a client fetch
 * meant a sleeping server showed a spinner and then nothing. Cached here, the
 * whole catalog renders instantly and is indexable.
 */
export const revalidate = 1800;

export default async function ProjectsPage() {
  const data = await fetchProjects().catch(() => ({ projects: [], count: 0, tools_covered: [] }));
  return <ProjectsClient projects={data.projects} />;
}
