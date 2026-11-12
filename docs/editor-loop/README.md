# Recorded editor loop

Two recorded coding-agent sessions, 12 November 2026. Each is a separate headless Claude Code process (`claude -p`, stream-json) given a developer kit and the local Fracture Lab stdio MCP server. The owner approved and ran every plan outside the agent. Checks ran in an isolated local Docker runner against the Sample provider model; no request reached PayPal.

What happened, as recorded: in both sessions the first submission was **inconclusive** (0 of 9 checks executed) and the corrected second submission **passed 9 of 9**. Neither agent's executed code failed a money invariant. In session A the first import was also stopped by a false positive in the lab's import scanner, which the owner fixed before the agent continued (turn 2 of the transcript). A hand-authored faulty control run through the same tools is included for contrast; it is not an agent session.

## session-a

- Condition: Full developer kit (interface guide, payment-core declarations, APIMatic SDK map), CLI default model
- Agent: Claude Code (headless: claude -p, stream-json output) 2.1.322, model `claude-fable-5-2`, session `721a6bfc-791f-420a-95fe-92057b4c7581`

| Submission | Revision hash | Plan | Job | Result |
| --- | --- | --- | --- | --- |
| 1 | `79f47b0808507c6322436fd501a2b2d4f9084cc0cec88dab1392599419c33b3e` | `1be87b74-a477-4369-85e7-83686d183619` | `8f3ed04d-d7b4-46ba-8c9d-2e27b1f3be66` | inconclusive, 0 of 9 |
| 2 | `09d2c74b632de27ef92873bfa16c4eff5177b36ec48835505f56d1c4bc0354ba` | `4aad14bc-bea8-435f-a2de-2395b3aa4a61` | `cf2e3edd-7537-4266-bfbb-8df4150b0b67` | passed, 9 of 9 |

Files: `session-a/transcript.jsonl` (scrubbed raw transcript), `session-a/revisions/`, `session-a/revision-1-to-2.diff`, `session-a/session.json`.

## session-b

- Condition: Minimal developer kit (interface guide only), smaller model selected with --model haiku
- Agent: Claude Code (headless: claude -p, stream-json output) 2.1.322, model `claude-haiku-5-5`, session `99442a75-0574-4545-bbf0-639e1fc9da5e`

| Submission | Revision hash | Plan | Job | Result |
| --- | --- | --- | --- | --- |
| 1 | `6792e99770485399940a44def7bb376144becb018a8f62a19198c39670e87c0d` | `22d57263-3f37-4dc7-a6e5-7b4e3cef0ac5` | `bd1ea89b-77e6-4899-940e-e8b87034be84` | inconclusive, 0 of 9 |
| 2 | `ffdcd00ed393e272ddad3b2d5e4ca33b92cf4b5021dcd44f9b7d07e0ac04e47f` | `e7a101ba-ce98-4f53-83c7-d461bd5b503b` | `95835832-17c2-4066-aeb2-bead003edc6d` | passed, 9 of 9 |

Files: `session-b/transcript.jsonl` (scrubbed raw transcript), `session-b/revisions/`, `session-b/revision-1-to-2.diff`, `session-b/session.json`.

## Faulty control (not an agent session)

tests/source-execution-fixtures/faulty (the repository's deliberately defective multi-file checkout), imported and run through the same CLI tools and the same isolated runner. Job `effd0f9a-fcb1-4d23-86c6-cfbe1580d9a9`, revision `867c258fed43da66470f68af4dd0152c0980b06f1747fbcdac8debbfa534527a`: failed, 2 of 9.

## Reproduce

`scripts/record-editor-loop.sh` records a session the same way; it needs the `claude` CLI, local Postgres and the local source-execution Docker image. `session.json` in this folder is the summary rendered at `/editor-loop`. Tool setup is in [../DEVELOPER_TOOLS.md](../DEVELOPER_TOOLS.md).
