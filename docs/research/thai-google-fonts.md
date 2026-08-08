# Thai Google Fonts for the ROPA admin UI

Research date: 2026-08-08

## Current context

`frontend/src/app.css` currently declares this sans stack:

```css
'Noto Sans Thai', 'Noto Sans SC', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
```

There is no Google Fonts stylesheet or local `@font-face` in the frontend. Therefore, the two Noto names only work when those fonts happen to be installed on the user's device; otherwise the UI falls through to the system font. The interface uses regular, medium, semibold, and bold text, so weights 400, 500, 600, and 700 are sufficient for the current components.

The product displays Thai, English, and Simplified Chinese. A Thai family therefore still needs a Chinese fallback such as Noto Sans SC; one Thai family does not cover all three scripts.

## Shortlist

| Family | Official coverage and styles | Fit for this UI (design judgment) | Tradeoff |
| --- | --- | --- | --- |
| **IBM Plex Sans Thai** | Google Fonts lists Thai, Latin/Latin Extended, weights 100–700, upright only. Its official description calls Plex a neutral but friendly grotesque with excellent legibility in print, web, and mobile interfaces. [Metadata](https://github.com/google/fonts/blob/main/ofl/ibmplexsansthai/METADATA.pb) · [Description](https://github.com/google/fonts/blob/main/ofl/ibmplexsansthai/DESCRIPTION.en_us.html) | **Best body/UI candidate.** Its documented interface legibility and engineered tone suit dense forms, tables, audit trails, and administration screens. | No Thai italic files and no variable axis in the Google Fonts package. Static 400/500/600/700 files must be requested. Chinese still needs Noto Sans SC. |
| **Sarabun** | Supports Thai and Latin, with upright and italic files at weights 100–800. Google Fonts identifies it with TH Sarabun New and notes its use in Thailand's Government Gazette. [Metadata](https://github.com/google/fonts/blob/main/ofl/sarabun/METADATA.pb) · [Description](https://github.com/google/fonts/blob/main/ofl/sarabun/DESCRIPTION.en_us.html) | Strong alternative when the product should feel formal, documentary, or familiar to Thai public-sector users—semantically close to a records-processing system. | The visual voice is more document/government-oriented than product-oriented. Test compact labels, numerals, and data tables before adopting it globally. |
| **Noto Sans Thai** | Covers Thai plus Latin/Latin Extended and is variable across weight 100–900 and width 62.5–100. Google describes it as modern loopless Thai, mainly suitable for headlines, packaging, and advertising. [Metadata](https://github.com/google/fonts/blob/main/ofl/notosansthai/METADATA.pb) · [Description](https://github.com/google/fonts/blob/main/ofl/notosansthai/DESCRIPTION.en_us.html) | Best technical continuity with the current CSS and the Noto Sans SC fallback. Variable weight/width provides flexibility with fewer font resources. | Google's own description is display-oriented rather than body-UI-oriented, so it should not win by default without a readability comparison on tables and long Thai content. |
| **Bai Jamjuree** | Covers Thai, Latin/Latin Extended, and Vietnamese; it has upright and italic files at weights 200–700. Google says it works well for headings and small passages and describes its square sans inspiration. [Metadata](https://github.com/google/fonts/blob/main/ofl/baijamjuree/METADATA.pb) · [Description](https://github.com/google/fonts/blob/main/ofl/baijamjuree/DESCRIPTION.en_us.html) | Good accent/heading option if ROPA needs a more distinctive identity. | The official intended use is headings and short passages, so it is a weaker global body choice for dense admin screens. A second body family also adds loading and consistency costs. |
| **Prompt** | Covers Thai, Latin/Latin Extended, and Vietnamese, with upright and italic weights 100–900. Google describes it as loopless Thai with geometric Latin and as suitable for web and print. [Metadata](https://github.com/google/fonts/blob/main/ofl/prompt/METADATA.pb) · [Description](https://github.com/google/fonts/blob/main/ofl/prompt/DESCRIPTION.en_us.html) | A contemporary option with broad weight/style coverage. | The official description warns that several Thai glyph groups can look similar and may cause confusion in very short text. Buttons, tags, statuses, and table cells are exactly such contexts, so it is not the first choice for this UI. |

## Recommendation

Use **IBM Plex Sans Thai** as the primary Thai/Latin UI family, with **Noto Sans SC** retained for Simplified Chinese and the existing system fallbacks after it.

Why:

1. Its official description explicitly supports legibility in web and mobile interfaces, which best matches a form- and table-heavy admin product.
2. The available 400/500/600/700 weights exactly cover the typography used today; there is no need to download its lighter weights.
3. Its neutral, engineered character fits compliance and records work without feeling as document-like as Sarabun or as display-led as Noto Sans Thai and Bai Jamjuree.
4. Prompt's own short-text warning makes it harder to recommend for action labels and compact status UI.

Use **Sarabun** instead if stakeholder testing shows that a familiar Thai government-document tone is an explicit product goal. Keep **Noto Sans Thai** as the low-change fallback option if visual continuity matters more than the stronger body-UI rationale.

## Loading and validation notes

- The Google Fonts CSS2 API supports requesting exact weights and recommends requesting only the styles actually used to reduce latency. It also supports `display=swap`. [Google Fonts CSS2 API](https://developers.google.com/fonts/docs/css2)
- For the current UI, request only 400, 500, 600, and 700 rather than every available weight.
- Decide between Google-hosted CSS and self-hosting based on the deployment's security, privacy, and offline requirements. This is an architectural decision, not a difference in the font's visual suitability.
- Before implementation, compare at minimum: Thai form labels, validation text, a dense data table, badges/tags, mixed Thai-English identifiers, Thai numerals, and the Simplified Chinese locale. Verify line height and clipping of Thai marks at the app's existing `text-xs` and `text-sm` sizes.
- Treat the recommendation as a design hypothesis until reviewed by native Thai readers on the actual screens; metadata proves coverage and styles, not perceived readability in this product.

## Primary sources

- [Google Fonts repository: Noto Sans Thai](https://github.com/google/fonts/tree/main/ofl/notosansthai)
- [Google Fonts repository: IBM Plex Sans Thai](https://github.com/google/fonts/tree/main/ofl/ibmplexsansthai)
- [Google Fonts repository: Sarabun](https://github.com/google/fonts/tree/main/ofl/sarabun)
- [Google Fonts repository: Bai Jamjuree](https://github.com/google/fonts/tree/main/ofl/baijamjuree)
- [Google Fonts repository: Prompt](https://github.com/google/fonts/tree/main/ofl/prompt)
- [Google Fonts repository: Noto Sans SC metadata](https://github.com/google/fonts/blob/main/ofl/notosanssc/METADATA.pb)
- [Google Fonts CSS2 API documentation](https://developers.google.com/fonts/docs/css2)
