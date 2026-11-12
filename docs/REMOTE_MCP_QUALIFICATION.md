# Canonical HTTPS MCP qualification

The shipped private stdio bridge completed one bounded HTTPS exchange against `https://paypal-ai-fracture-lab.vercel.app/api/mcp` on **12 November 2026, 15:12–15:13 UTC**. The installed `@modelcontextprotocol/sdk` was **1.32.2**. This was an actual deployed transport exchange using an existing owner grant and immutable source import.

The canonical alias and project production target both identified deployment `dpl_4auME1QTbpTvM9WqiUAXgYpMz7vE`, source `aa1c85172c80add3dbd9c6e87b17c28070bff60e`, with source archive SHA-256 `c2972c7d59912fe3201cf604b2718885e91ae127ff41f9929284d5955b9362d3`. The deployment was ready. A documentation-only successor commit does not change this runtime binding.

The [public receipt](evidence/remote-mcp-https-v1.json) is an explicit allowlist derived from the retained private qualification. Its hashes bind the original private result and staged refusal; bearer material, cookies, connection strings, grant identifiers and private source responses are not published.

## Observed exchange

| Request | Observed status |
| --- | --- |
| Initialize | 200 |
| Initialized notification | 202 |
| Tool discovery | 200 |
| Optional standalone SSE GET | 405, authenticated |
| `list_source_workspaces` | 200 |
| `get_source_workspace` | 200 |
| `read_source_file` | 200 |

The **seven HTTP requests** contained exactly **three declared source reads**, with zero automatic retries, no client errors and empty bridge stderr. The original import still had **84 nodes / 89 edges**, revision `57bcb46c147a2c5ada11cc60908d8d5e4f1e0673a4b4aedce9af6247ed8bfa36`, and `faulty.ts` SHA-256 `36098191e41a5f5c84259501fc70fb93397b59a9f282adeebadf435320891943`. The original grant deadline stayed **13 November 2026, 08:03:07.747 UTC**; it was not renewed.

Before promotion, the separately addressed staged hostname returned **403 `REMOTE_MCP_DESTINATION_DENIED`** with `no-store` and no cookie. Canonical-origin pinning was kept intact. After promotion, unauthenticated canonical access returned **401**. The authenticated **405** above is the expected installed-SDK boundary for an endpoint without a standalone SSE stream.

Three separate continuity GETs then recovered the original hosted purchase, repair proof, four model attempts and Toolkit investigation. Proof `7bcf65e3-3f9d-4c60-8593-27f72252fc29` retained SHA-256 `bf8ca031a21424bf6035de99381e2810f85802d1b8c4ac485f4f0181314c891b`. Its actual model and isolated execution observations belong to the earlier [hosted runtime protocol](HOSTED_RUNTIME_QUALIFICATION.md); this exchange did not run them again.

## Preservation and limits

All **3,506 pre-existing rows** and **56 table shapes** remained exact. Two new rate-window rows account for the seven transport requests and three source reads, bringing the retained total to **3,508**. No application command, new admission, model request, financial-provider request or imported-source execution occurred. Earlier unattributed Sample rows remain retained without assigning authorship.

The 47 focused local SDK checks and compiled-route exchange remain separate evidence for expiry, revocation, wrong-owner refusal, acknowledgement recovery and request boundaries. This deployed protocol exercised the exact existing-source read lane. It does not establish a native editor repair-loop recording, arbitrary imported-application execution or a new grant-distribution flow. Those remaining features are listed in the [completion ledger](STAGE7_COMPLETION_LEDGER.md).

The sealed context study remains **600 original candidates: 301 scored / 299 infrastructure outcomes**, **606 attempts / six retries / 601 generations**. Eight strata remain incomplete and comparison intervals remain withheld. This qualification did not execute or reclassify any study case.
