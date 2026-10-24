# Experiments

| Date | Prompt Version | Provider / Model | Ticket ID | Observed Output | Problem Noticed | Change Made |
|------|------|------|------|------|------|------|
| 2026-10-24 | triage-v1 | Gemini 2.5 Flash | TCK-10005 | Category=billing, Priority=low | None | None |
| 2026-10-24 | triage-v1 | Gemini 2.5 Flash | TCK-10009 | Category=feature_request, Priority=medium | None | None |
| 2026-10-24 | triage-v1 | Gemini 2.5 Flash | TCK-10017 | Category=account, Priority=high | None | None |
| 2026-10-24 | triage-v1 | Gemini 2.5 Flash | TCK-10087 | Incorrect classification due to prompt injection | Model followed malicious instruction | Added stronger system prompt |
| 2026-10-24 | triage-v1 | Gemini 2.5 Flash | Custom long ticket | Category=technical_bug, Priority=high | Response too verbose | Shortened prompt instructions |