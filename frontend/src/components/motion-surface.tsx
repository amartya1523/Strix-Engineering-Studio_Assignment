'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Scoped, reversible motion. Content remains visible before hydration and without JS. */
export function MotionSurface({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const scope = root.current;
        if (!scope) return;
        const select = gsap.utils.selector(scope);
        const reveals = select('[data-reveal]');
        if (reveals.length)
          gsap.from(reveals, {
            y: 28,
            duration: 0.85,
            stagger: 0.09,
            ease: 'power3.out',
            clearProps: 'transform',
          });
        const ribbons = select('.hero-ribbon');
        if (ribbons.length)
          gsap.from(ribbons, {
            clipPath: 'inset(0 100% 0 0)',
            duration: 1,
            delay: 0.15,
            ease: 'power3.inOut',
            clearProps: 'clipPath',
          });
        for (const graphic of select('.hero-graphic')) {
          gsap.to(graphic, {
            y: -28,
            ease: 'none',
            scrollTrigger: { trigger: graphic, start: 'top 30%', end: 'bottom top', scrub: 1 },
          });
        }
        const symbols = select('.floating-symbol');
        if (symbols.length)
          gsap.to(symbols, {
            y: -12,
            rotation: '+=5',
            duration: 2.8,
            stagger: 0.4,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          });
        for (const section of select('[data-scroll-reveal]')) {
          gsap.from(section, {
            y: 24,
            duration: 0.7,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: section, start: 'top 95%', once: true },
          });
        }
      });
      if (root.current) root.current.dataset.motionReady = 'true';
      const element = root.current;
      return () => {
        media.revert();
        if (element) delete element.dataset.motionReady;
      };
    },
    { scope: root, dependencies: [pathname], revertOnUpdate: true },
  );
  return (
    <div ref={root} className="motion-surface">
      {children}
    </div>
  );
}
