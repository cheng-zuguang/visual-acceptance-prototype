# DiffLab Prototype Validation Notes

[简体中文](./PROTOTYPE_NOTES.md) | [English](./PROTOTYPE_NOTES.en.md)

> PROTOTYPE — This code exists to answer product and algorithm questions. It should not be released directly as a production implementation.

## Questions to answer

Given a Figma Frame or reference image, a public H5 URL, and YAML acceptance rules, can the system reliably produce:

1. A reproducible pass/fail verdict;
2. Differences that can be located to page regions and DOM elements;
3. Remediation guidance and evidence that designers, product managers, and developers can all understand?

## Established prototype boundaries

- Compare one Frame, one viewport, and the default static page state per run.
- The Figma Frame dimensions automatically become the H5 screenshot viewport; DPR is fixed at 1.
- Support a Figma Frame URL or PNG/JPG/WebP, but not `.fig` files.
- The H5 page must be accessible without login.
- Rules are the only gating source; AI explains findings but does not determine the verdict.
- Exact `data-figma-id`, text/geometry automatic matching, and confidence-based downgrading coexist.
- There is no database, user system, or task history. Credentials are stored in plaintext in browser `localStorage`, sent only with the current request, and can be cleared in the UI.

## Current validation results

- The built-in sample completes reference capture, H5 capture, node matching, rule execution, and report generation end to end.
- Deliberate layout, typography, color, border-radius, and missing-element differences in the built-in sample result in failure.
- The UI can generate side-by-side, opacity-overlay, diff-heatmap, HTML, Markdown, JSON, and PNG outputs.
- A custom AI API base URL or full `/responses` URL is supported, including local compatible services without an API key.
- The UI can fetch models from a compatible `/models` endpoint, select or manually enter a model, and record the actual model in the report.
- The model list appears in a searchable in-app panel; credentials, selected model, and the most recently fetched model list survive refreshes.
- The production build and TypeScript type check pass.

## Still unanswered

- False-positive and false-negative rates of automatic matching on real business pages.
- Noise levels caused by fonts, image assets, and complex Figma Auto Layout across environments.
- Final thresholds suitable for the first batch of real samples.

After validating real samples, record the conclusions here and decide whether to delete the prototype or rewrite the useful design into the production codebase.
