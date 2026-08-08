# Repository agent instructions

## Shell commands

- Read and follow `/Users/sh0ckpro/.codex/RTK.md`.
- Prefix shell commands with `rtk`.

## Git workflow

- Read and follow the `git-flow` skill at `/Users/sh0ckpro/.agents/skills/git-flow/SKILL.md` before creating branches, commits, tags, or merge requests.
- Use `feature/<ticket>-<short-description>` for feature work, for example `feature/UI-017-language-selector`.
- Use the matching `bugfix/`, `hotfix/`, or `release/` pattern from the skill for other work types.
- Do not create branches with the `codex/` prefix.
- Use Angular commit messages: `<type>(<scope>): <short description>`.
- Do not push directly to `main` or `develop`.

## Accessibility

- Treat accessibility as a requirement for every frontend page and component, not only dialogs. Target WCAG 2.2 Level AA and follow the relevant [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern for each custom widget.
- Prefer native semantic HTML and built-in browser behavior. Add ARIA only when native semantics cannot express the required name, relationship, state, or behavior; no ARIA is better than incorrect ARIA.
- Every interactive control must have an accessible name, keyboard support, a visible focus indicator, and a logical focus order. Aim for 44 CSS-pixel touch targets and never make an active target smaller than the WCAG 2.2 minimum without an allowed exception.
- Programmatically associate form labels, hints, validation errors, and required/invalid states with their controls. Announce asynchronous status changes only when they are useful and avoid noisy live regions.
- Use page landmarks, a single page-level heading, sequential heading levels, skip links for repeated navigation, `aria-current` for current navigation, and native table captions and headers.
- Hide decorative icons from assistive technology. Give informative non-text content and icon-only controls an accessible name.
- For disclosure, menu, listbox, tabs, combobox, tooltip, and other composite widgets, implement the complete keyboard and focus behavior defined by the matching APG pattern; a role alone is never sufficient.
- Add accessibility regression tests for new or changed shared UI behavior and verify keyboard flows manually when automation cannot cover them.
- Every modal dialog must follow the [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Prefer native `<dialog>` opened with `showModal()` so focus is contained, the background is inert, and platform dismissal such as `Escape` is preserved.
- Give every dialog an accessible name linked to its visible title, move initial focus inside it, and return focus to the invoking control when it closes.
- For destructive or difficult-to-reverse confirmations, initially focus the least destructive action, such as Cancel; never autofocus the destructive action.
- Keep a visible close or Cancel action in the dialog's tab sequence.
