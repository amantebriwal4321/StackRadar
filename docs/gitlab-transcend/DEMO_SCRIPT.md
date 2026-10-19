# Demo script

Under three minutes. No names. Record the GitLab project, the session log, and the health URL. Cut the waits. Duo sessions are not instant.

Screen: the showcase project, AI > Flows, five flows enabled.

Say: StackRadar already scores developer tools from GitHub and public developer forums. This demo is the part after the code is written. Five Duo flows review a merge request, answer a red pipeline, patch a scanner finding, and ship to Cloud Run only after a person approves. A person still merges.

Screen: open the demo merge request. Show `demo/package.json` with react and lodash 4.17.20. Assign the MR Reviewer service account.

Say: This merge request adds React, which the catalog tracks, and an old lodash pin. The reviewer reads the diff, calls the StackRadar API, and posts one note. If React's trend is declining, the note says so, with the score the API returned. If the API is down, the note says the score was not measured. It does not invent one, and it does not merge.

Screen: the pipeline graph. `test:backend` red. Open the job log on the inverted assertion. Open the draft merge request from Pipeline Doctor.

Say: The same branch fails a test on purpose. Pipeline Doctor reads that log and opens a draft fix. It ignores the smoke job. That one belongs to the incident flow. The draft title is the handoff. A person merges it, or they don't.

Screen: the dependency scanning job, then the Security Remediator draft merge request. Show that it only touches `demo/`.

Say: Dependency scanning flags the lodash pin. Security Remediator opens a second draft that bumps or removes it. Findings in files this commit did not touch become an issue, not a drive-by edit of the real lockfile.

Screen: an issue. Mention the Release Captain service account. Show the notes, then the approval buttons. Click Approve. Show the new pipeline and the Cloud Run URL returning health JSON.

Say: Release Captain writes notes from the commits, then waits. Approve starts a pipeline that deploys the API to Cloud Run and curls the health endpoint. Reject leaves the notes and does not deploy. The fresh Cloud Run database is not the score source. Scores stay on the existing API.

Screen: if you have a failed `smoke:health` log, open the incident issue, click Approve, and show the draft rollback. If you do not, show the flow YAML and say the gate is the same shape.

Say: When that health check fails, Incident Responder opens an issue with the cause it can read in the log. One approval, then a draft rollback. A person merges the rollback. That is the loop.
