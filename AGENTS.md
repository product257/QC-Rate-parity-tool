<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shared property/comp-set selection lives in `src/components/qc/selection.tsx` context (mounted in __root) so every screen reads the same scope; mock data is in `src/lib/qc-data.ts` until a backend exists.
- Client pages use flat client-prefixed routes and a root-mounted ClientProvider for property-scoped session-only decisions; illustrative client audit data stays separate from internal audit data so client actions cannot alter staff screens.
