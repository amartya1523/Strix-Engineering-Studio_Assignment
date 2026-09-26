# CodeAtlas Studio interface

The user supplied [Kafoor-Nimas/gsap-awwwards-website](https://github.com/Kafoor-Nimas/gsap-awwwards-website) as the visual reference. Its large condensed lettering, warm paper colors, tilted bands and GSAP animation direction informed the design. CodeAtlas retains its own code-review content, original CSS illustrations and application workflows.

## Design

- Milk paper `#faeade`, chocolate ink `#523122`, terracotta `#7f3b2d`, coral `#f6b397`.
- Antonio bold for display headings; system sans-serif for forms and dense workspace content; monospace for source code.
- Antonio is bundled through `@fontsource/antonio`, so rendering does not require a Google Fonts request. Its SIL Open Font License is included with the dependency.
- Rounded paper cards, pill controls, a rotated headline band and original orbit/code-card graphics.
- Severity colors remain distinct from decorative branding.
- The same theme covers authentication, projects, provider configuration, history, source exploration, review results and chat.

## Motion and accessibility

`frontend/src/components/motion-surface.tsx` uses GSAP, ScrollTrigger and `@gsap/react`. A scoped `useGSAP` context and `gsap.matchMedia` revert tweens and scroll triggers on navigation/unmount and when motion preferences change. Only decorative elements and section transforms animate; controls and body content are never hidden behind a page loader or scroll lock.

- Headline entry and clip-path ribbon reveal.
- Floating code symbols and scroll-linked graphic parallax.
- Short section-entry transforms.
- `prefers-reduced-motion: reduce` disables GSAP motion and CSS transitions; content is visible before hydration and when motion is disabled.
- Authenticated workspace behavior is unchanged. No extra analytics or remote artwork requests are introduced.
- Keyboard focus outlines remain visible, source code keeps its dedicated scrolling pane, and mobile navigation uses the existing explicit menu button.

## Verification

The browser suite covers the full application workflow, the mobile populated workbench, 360/390/768/1440-pixel layouts, animation completion, runtime reduced-motion changes and navigation between animated and nonanimated pages. Screenshots wait for hydration and completed ribbon reveals. See `TEST_REPORT.md` for the results and verification limits.
