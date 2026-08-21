# Replacement App GitHub Workflow

All work on the containerized replacement application is issue-first and is delivered through pull
requests. Legacy ToolJet work remains visible in the same repository but is not part of this workflow
unless it is explicitly migrated into a new v2 issue.

## Before implementation

1. Create a focused GitHub issue or select an existing issue that fully covers the requested change.
2. Add the issue to the organization project:
   `Studio-Animal-Aided-Design/projects/1`.
3. Apply the `v2` label and the appropriate `area:*`, `type:*`, and `priority:*` labels.
4. Set the project status to `In progress` when implementation starts.
5. Create a dedicated branch from the current default branch.

Use branch names that include the issue number and a short English description:

- `feat/72-public-catalogue`
- `fix/73-species-portrait-layout`
- `chore/81-v2-workflow`

If a new request spans independent deliverables, split it into separate issues and branches. Do not
expand an active issue silently.

## During implementation

- Keep changes within the issue scope.
- Preserve unrelated local changes and never include them in the commit.
- Record durable architecture, schema, workflow, and migration decisions in `workspace/second-brain`.
- Run verification appropriate to the affected surface before publishing the branch.
- Add follow-up work as issues instead of hiding it in comments or unrelated commits.

## Pull request handoff

1. Commit only the files belonging to the issue.
2. Push the dedicated branch.
3. Open a draft pull request against `main` unless the user explicitly requests a ready-for-review PR.
4. Reference the issue in the PR body with `Closes #<issue-number>`.
5. Summarize scope, verification, risks, and intentionally deferred work.
6. Move the project item to `In review`.
7. Leave the merge to the repository maintainer. Codex must not merge into `main`.

## Definition of done

- The issue has the `v2` label and belongs to Project 1.
- The change is implemented and verified on its own branch.
- A PR references the issue and contains no unrelated changes.
- Project status reflects the current lifecycle state.
- Required second-brain documentation is updated.
