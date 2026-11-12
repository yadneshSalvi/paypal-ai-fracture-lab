# APIMatic PayPal context setup

Installed on November 10, 2026: the official **PayPal Context Plugin v0.4.1** skill content, scoped to this repository for Codex. No APIMatic account or API key is needed for this plugin.

- Source: [APIMatic PayPal plugin](https://context.apimatic.io/plugins/paypal/)
- Pinned repository commit: `context-plugins/plugin-marketplace@7cbdf85dc95f09d9ede8c5d349506686684fa0d4`
- Installed context: **29 skills, 32 files** in `.agents/skills/` — 9 TypeScript, 11 Python, and 9 .NET skills.
- Original manifest, README, MIT license, and file hashes: `.agents/apimatic-paypal/`.
- Verification: every installed skill file matched the official commit's Git blob hash; SHA-256 hashes are recorded in `.agents/apimatic-paypal/provenance.json`.

## Scope and installation

Preflight checked `npx --yes context-plugins@0.12.0 --help`, the package README, and `codex plugin add --help`. APIMatic's installer registers plugins for the whole user account and offers no project-scope flag. To keep this setup local, Codex's bundled Skill Installer installed all skill directories from the official plugin into the repository's `.agents/skills/` discovery directory. No global Codex configuration or other assistant settings were changed.

This is a repository-local installation of the plugin's complete skill content, not a user-wide marketplace registration. The upstream plugin contains skills only; no MCP connection, account, runtime service, or API credential is omitted by this method. Codex documents this local discovery location in [Build skills](https://developers.openai.com/codex/skills/).

Reproducible installation command (run from this repository on a fresh checkout; the helper refuses to overwrite installed skill directories):

```bash
python3 - <<'PY'
import json, subprocess, urllib.request
from pathlib import Path

ref = '7cbdf85dc95f09d9ede8c5d349506686684fa0d4'
url = f'https://api.github.com/repos/context-plugins/plugin-marketplace/git/trees/{ref}?recursive=1'
with urllib.request.urlopen(url) as response:
    tree = json.load(response)['tree']
paths = [str(Path(item['path']).parent) for item in tree
         if item['path'].startswith('plugins/paypal/skills/')
         and item['path'].endswith('/SKILL.md')]
helper = Path.home() / '.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py'
subprocess.run([
    'python3', str(helper), '--repo', 'context-plugins/plugin-marketplace',
    '--ref', ref, '--dest', str(Path.cwd() / '.agents/skills'),
    '--path', *paths
], check=True)
PY
```

## Use in this project

Start a TypeScript integration task with `$typescript-integrate-paypal` and `$typescript-getting-started`; corresponding Python and .NET skills are also installed. If the skills do not appear, start a new Codex session in this directory.

The runtime SDK the skills describe is installed and pinned: package `paypal` 2.29.0 from `context-plugins/paypal-typescript-sdk` at commit `5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2` (`package.json`). It is not `@paypal/paypal-server-sdk`. The application reaches it through `@fracture/paypal-core`, pinned to the vendored archive `vendor/fracture-paypal-core-0.2.2.tgz`. The `vendor/` directory also holds archives 0.2.3 to 0.2.7 for sibling projects, and `packages/paypal-core/` is the 0.2.7 source; the application pin stays at 0.2.2 and its conformance proof records that archive's hash.

How the plugin and SDK were used, with file and line references:

- [`docs/apimatic/README.md`](docs/apimatic/README.md): the chain from SDK call to contract row to executed proof.
- [`docs/apimatic/CONTEXT_PLUGIN.md`](docs/apimatic/CONTEXT_PLUGIN.md): which skill informed which code.
- [`docs/apimatic/SDK_USAGE.md`](docs/apimatic/SDK_USAGE.md): every SDK method called, its call site and its test.
- [`docs/apimatic/FINDINGS.md`](docs/apimatic/FINDINGS.md): where documented and observed behaviour differed.
- [`paypal-plan.md`](paypal-plan.md): the integration contract written from the skills and the SDK map.

## Keeping the proof current

```sh
npm run check:conformance   # hashes the 11 runtime files against docs/evidence/application-conformance.json; no tests, no database
npm run verify:app          # typecheck, application and model tests on the local provider model, then rewrites the proof
npm run test:hermetic       # the test files that need no database, Docker, network, model key or .env
```

`check:conformance` runs in CI and as the `prebuild` step of `npm run build`, which is the command the hosted build runs. A stale proof therefore fails the build and names the files that changed. The proof is Sample evidence from the local provider model, not a live PayPal result.

The optional [one-month Basic subscription claim](https://docs.google.com/forms/d/e/1FAIpQLScc2oCgAFACm7d6H3R4mgzv-O34DdyVnLIBNiwmUNggr_-hhA/viewform) requires a project URL and evidence of plugin usage; whether it has been submitted is not recorded in this repository.
