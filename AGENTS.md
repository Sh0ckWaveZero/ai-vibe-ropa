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

- Every modal dialog must follow the [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Prefer native `<dialog>` opened with `showModal()` so focus is contained, the background is inert, and platform dismissal such as `Escape` is preserved.
- Give every dialog an accessible name linked to its visible title, move initial focus inside it, and return focus to the invoking control when it closes.
- For destructive or difficult-to-reverse confirmations, initially focus the least destructive action, such as Cancel; never autofocus the destructive action.
- Keep a visible close or Cancel action in the dialog's tab sequence.
