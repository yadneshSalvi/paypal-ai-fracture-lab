# Endpoint-specific sandbox error coverage

The retained F5 campaign compares three explicitly requested provider-negative responses with a native control on each of five fresh, unapproved USD1 orders. All twenty original requests returned HTTP422 with the expected typed SDK error. Forty independent original-order GETs remained CREATED without payment resources. No payer approved these orders and no funds were captured.

The selected capture pairs are `INSTRUMENT_DECLINED`, `DUPLICATE_INVOICE_ID`, and `PAYER_CANNOT_PAY`. Each uses the pinned APIMatic SDK's public `payPalMockResponse` field, serialized to the documented `PayPal-Mock-Response` JSON header. The native control omits that header and returns `ORDER_NOT_APPROVED`. Mock order was randomized within each matched trial after its control; each request has its own preregistered stable UUID. Automatic SDK retries were disabled.

The campaign froze the exact source, merchant fingerprint, five create payloads, all twenty call identities, sequence, limits and official documentation fingerprints before dispatch. Its protocol hash is `954f14b18a14694d67002fec69be728e32d39869bdec77246244a50877d15850`. An exclusive lock, atomic durable state and ready-to-dispatch transition prohibit silent repeats. Unknown writes retain their original identity and stop further work. Readbacks can only use the campaign's original returned IDs; no lookup-by-request-ID is invented.

The safe result is [the qualification record](evidence/paypal-negative-pairs-qualification.json). `inspectNegativeCampaign` derives every UI count from complete matched observations, exact response codes, typed errors, original-resource bindings and chronology. It rejects altered scope, copied trials, missing readbacks and any payment effect. Tests use both the retained report and explicitly synthetic adversarial edits, plus the real installed SDK against a local transport.

These observations qualify error injection for these three specific endpoint/code pairs in one sandbox merchant environment. They do not establish organic declines, invoice uniqueness enforcement, approved-payer recovery, or successful execution of the separate application N1–N3 scenarios. The raw private provider bodies and resource identifiers remain outside the public report.

Sources: [PayPal request-header negative testing](https://developer.paypal.com/negative-testing/request-headers), [Orders errors by endpoint](https://developer.paypal.com/api/orders/v2/error-messages). Both were read and fingerprinted on 11 November 2026.
