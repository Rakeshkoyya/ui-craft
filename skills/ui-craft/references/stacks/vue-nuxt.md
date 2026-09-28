# Stack: Vue and Nuxt

Covers Vue 3 (Vite) and Nuxt 3/4. Tailwind specifics are in [tailwind.md](tailwind.md).

## Where tokens live

- Vue + Vite: `src/assets/tokens.css` imported once in `main.ts` (`import "./assets/tokens.css"`).
- Nuxt: add global CSS in `nuxt.config.ts`: `css: ["~/assets/css/tokens.css", "~/assets/css/base.css"]`.
- Scoped styles (`<style scoped>`) and CSS Modules read global custom properties normally. Use
  `v-bind()` in `<style>` only for truly dynamic per-instance values, not for theme tokens.

## Fonts

- Nuxt: the `@nuxt/fonts` module (`npx nuxi module add fonts`) resolves families you reference
  in CSS (`font-family: "Familjen Grotesk"`), self-hosts them from providers such as Google or
  Fontsource, and generates metric-matched fallbacks. Keep font families in the tokens and let
  the module find them.
- Vue + Vite: install Fontsource (`npm i @fontsource-variable/<family>`) and import it once in
  `main.ts`, or self-host as in [html-css.md](html-css.md).

## Images

Nuxt Image (`@nuxt/image`) provides `<NuxtImg>` and `<NuxtPicture>` with responsive sizes and
format conversion:

```vue
<NuxtImg src="/studio.jpg" width="1600" height="1067" sizes="100vw md:50vw"
         alt="Wheel room with six students at work" preload />
```

Always pass `width`/`height` (or a fixed aspect-ratio container). In plain Vue, use `<img>` with
`width`, `height` and `srcset`.

## Route and page transitions

Vue's `<Transition>` animates enter/leave with classes. Nuxt applies it to pages via config:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: { pageTransition: { name: "page", mode: "out-in" } },
});
```

```css
.page-enter-active, .page-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.page-enter-from, .page-leave-to { opacity: 0; transform: translateY(var(--dist-sm)); }
```

Name the properties explicitly; the Nuxt docs example uses `transition: all`, which UC001 flags.
Disable per page with `definePageMeta({ pageTransition: false })`.

Native View Transitions: `experimental: { viewTransition: true }` in `nuxt.config.ts`. With
`true`, Nuxt skips view transitions when the user prefers reduced motion. Style them with the
recipes in `assets/motion/view-transition.css`. Use either Vue page transitions or view
transitions for a given route, not both.

In plain Vue Router, wrap `<RouterView v-slot="{ Component }">` in `<Transition>` the same way.
Lists use `<TransitionGroup>`; animate `transform` and `opacity` only, and let the
`-move` class handle reordering with `transition: transform`.

## Reduced motion

- CSS: the motion tokens collapse distances under `prefers-reduced-motion: reduce`; keep
  transitions keyed on those tokens.
- JS: VueUse `usePreferredReducedMotion()` returns `'reduce' | 'no-preference'` reactively.
  Or wrap `matchMedia` in a composable:

```ts
export function useReducedMotion() {
  const reduce = ref(false);
  onMounted(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    reduce.value = mq.matches;
    mq.addEventListener("change", (e) => (reduce.value = e.matches));
  });
  return reduce;
}
```

Gate GSAP/Motion timelines on it before creating them, and kill them in `onBeforeUnmount`.

## SSR and hydration pitfalls (Nuxt)

- Don't read `window`, `matchMedia` or `localStorage` during setup on the server. Use
  `onMounted`, `import.meta.client`, or `<ClientOnly>` for purely client widgets.
- Content rendered at `opacity: 0` waiting for a client animation stays hidden if hydration is
  slow. Prefer CSS entrances, and check the first frame of `capture.mjs --motion`.
- Theme flash: use `@nuxtjs/color-mode` or an inline head script that sets `data-theme` before
  paint.
- Animation libraries touching the DOM must run after mount, and be cleaned up on unmount to
  avoid leaks across route changes.

## Components

Search with `--stack vue` (or `--stack nuxt`, which also matches Vue rows):
`python <skill>/scripts/search.py "date picker" --stack nuxt`. Theme libraries through their CSS
variables or config, mapped to your tokens ([components.md](../components.md)).
