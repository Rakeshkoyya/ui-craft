# Stack: Svelte and SvelteKit

Covers Svelte 5 and SvelteKit 2. Tailwind specifics are in [tailwind.md](tailwind.md).

## Where tokens live

- SvelteKit: `src/app.css` (tokens + base), imported once in the root layout
  `src/routes/+layout.svelte` (`import "../app.css";`).
- Component `<style>` blocks are scoped and read global custom properties normally. Use
  `:global()` sparingly, for things like styling rendered Markdown.
- Pass per-instance values as custom properties on the component: `<Card --card-pad="var(--space-6)" />`.

## Fonts

Install Fontsource (`npm i @fontsource-variable/<family>`) and import it in the root layout, or
self-host WOFF2 files in `static/fonts/` and declare `@font-face` in `app.css`
([html-css.md](html-css.md)). Preload the critical file from `src/app.html` or with
`<svelte:head>` in the root layout. Add a metric-matched fallback ([typography.md](../typography.md) §6).

## Images

`@sveltejs/enhanced-img` generates responsive formats and sizes at build time and sets
dimensions:

```svelte
<enhanced:img src="./studio.jpg" alt="Wheel room with six students at work" sizes="(min-width: 1024px) 50vw, 100vw" />
```

It needs the Vite plugin added before `sveltekit()` in `vite.config`. For remote or CMS images,
use `<img>` with `width`, `height`, `srcset` and `loading`.

## Route and page transitions

SvelteKit + View Transitions via `onNavigate` (runs just before client-side navigation):

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onNavigate } from "$app/navigation";
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>
```

Style the transition with the recipes in `assets/motion/view-transition.css`, including their
reduced-motion rules. Name shared elements with `style:view-transition-name={`photo-${id}`}`
(names must be unique on the page).

In-component transitions: `transition:`, `in:`, `out:` with `svelte/transition` (`fade`, `fly`,
`slide`, `scale`) and `animate:flip` for list reordering. `slide` animates height; use it only
for small disclosures (UC002), or prefer `fade`/`fly`.

## Reduced motion

Svelte 5.7+ exports a reactive media query:

```svelte
<script>
  import { prefersReducedMotion } from "svelte/motion";
  import { fly } from "svelte/transition";
</script>

{#if open}
  <div transition:fly={{ y: prefersReducedMotion.current ? 0 : 16, duration: 260 }}>…</div>
{/if}
```

On older Svelte, wrap `matchMedia` in a store or `$state` set up in `onMount`. Built-in
transitions don't check the preference themselves; pass reduced parameters or skip them.

## SSR and hydration pitfalls

- `window`, `document` and `matchMedia` don't exist during SSR. Use them in `onMount`, `$effect`,
  or behind `import { browser } from "$app/environment"`.
- Svelte `in:` transitions don't play on the initial server-rendered page load by default
  (only on client-side changes), unless the app is mounted with `intro: true`. Don't rely on them
  for a first-load entrance; use CSS animations, which run on SSR markup.
- Content hidden until an `IntersectionObserver` fires stays hidden if JS fails: hide reveal
  targets only under a class that JS adds.
- Theme flash: set `data-theme` with an inline script in `src/app.html` before the body renders.
- Clean up GSAP/Motion instances and observers in the function returned from `onMount` or
  `$effect`.

## Components

Search with `--stack svelte`: `python <skill>/scripts/search.py "dialog" --stack svelte`.
Primitives libraries expose `data-state` attributes; style states with those and map any theme
variables to your tokens ([components.md](../components.md)).
