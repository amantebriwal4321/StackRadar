# Devpost draft

Paste into the form. Cut anything the form does not ask. The video is a separate upload, under three minutes, public or unlisted, no third-party music.

## What it does

StackRadar scores 31 developer tools from GitHub stars, forks, and public forum mentions, on an absolute 0 to 100 scale. Hiring mentions are shown beside the score and are not part of it.

This submission adds the steps after code lands. On a GitLab project, five Duo Agent Platform flows take a merge request, a failed pipeline, scanner output, a release, and a failed health check:

- MR Reviewer comments on dependencies the diff adds. It calls the StackRadar API and flags a catalog tool whose trend is declining, or whose growth is below -5%. Untracked names and a failed lookup are labeled, not guessed.
- Pipeline Doctor reads a failed test, lint, or image-build log and opens a draft fix merge request.
- Security Remediator turns SAST, dependency, and secret-scan findings from that pipeline into a draft fix, limited to files the commit touched.
- Release Captain writes release notes, waits for an approval, then starts the Cloud Run pipeline.
- Incident Responder, when the post-deploy health check fails, opens an incident issue and, after approval, a draft rollback merge request.

A person merges code and approves the deploy. CI runs tests, lint, Docker builds, and the GitLab SAST, dependency scanning, and secret detection templates. Cloud Run is gated on three CI variables and is skipped when they are unset.

## How it was built

The app is an existing MIT project: FastAPI, a Next.js frontend, and the scoring code in `backend/app/services/scoring.py`. The GitLab work is new and lives in the repo so it can be pasted into the AI section.

Flows use the published flow registry v1 schema: `version: v1`, `environment: ambient`, `AgentComponent`, `HumanInputComponent`, inline prompts with `unit_primitives` and `placeholder: history`, and routers. Custom flows cannot select an AI Catalog agent, so each flow carries its own prompt and toolset. Trigger types used are mention, assign, assign reviewer, and pipeline events.

The MCP server in `mcp/` speaks streamable HTTP and proxies the public StackRadar API. IDE chat can load it from `.gitlab/duo/mcp.json`. The flows call the REST API themselves, because GitLab.com does not accept an arbitrary MCP URL in the AI Catalog.

Cloud Run deploy is `scripts/deploy_cloud_run.sh`, invoked from `.gitlab-ci.yml`. It builds with Cloud Build, stores images in Artifact Registry, and deploys the API and the MCP server. Smoke checks both health URLs.

## Challenges

Creating and enabling a flow, and saving CI variables, wants the Maintainer or Owner role. The hackathon Developer + AI role can push code and can mention a service account after a maintainer enables the flow. The YAML is in git for that handoff.

A flow cannot start another flow, and a trigger cannot target a custom agent. Pipeline Doctor and Incident Responder both listen to failed pipelines, and each exits when the failed job is not theirs.

The workflow token is `ai_workflows` scoped and is sent as a Bearer token. Creating a pipeline can come back 401 or 403. Release Captain then posts the click path: Build > Pipelines > Run pipeline, with `DEPLOY_CLOUD_RUN` set to 1.

A new Cloud Run instance seeds tools at score 0. The reviewer is pinned to the existing measured API so a cold deploy is not treated as a momentum collapse.

The trigger Goal field is behind a feature flag and may not show. The flows do not need it. They parse the comment text, the merge request IID, or the pipeline webhook.

## What is new since Oct 5, 2026

New in this branch, for the submission period:

- `.gitlab-ci.yml`, including the scanner templates and the gated Cloud Run deploy
- `.gitlab/duo/flows/` and the agent checklists
- the MCP server and `.gitlab/duo/mcp.json`
- `docs/gitlab-transcend/`
- the demo patch that adds a failing test and the lodash 4.17.20 manifest

Not new: the catalog, the scoring formula, the learning pages, and the Vercel and Render deployment. Those stay as they were. This branch does not change that deploy.

Original project: https://github.com/amantebriwal4321/StackRadar

License: MIT, file `LICENSE` at the repo root.

Google Cloud: the deploy code is in the repo. The live URL is the Cloud Run service URL after the first successful `deploy:cloud-run` job, path `/api/v1/health`. It has to stay up through judging. If the GCP variables are not set yet, the pipeline still runs and records that the deploy was skipped.

Not entering the environmental prize. There is no Software Carbon Intensity number in this writeup because none was measured. The Cloud Run services cap at 2 instances, and the scraper loop is off, so a cold instance does not run the 30 minute fetch.
