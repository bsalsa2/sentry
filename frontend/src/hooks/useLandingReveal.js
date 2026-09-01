/**
 * The scroll-driven motion shared by every landing page: sections rise and
 * fade in as they cross the viewport, numeric stats count up, and (on the
 * home page only) the hero plays one orchestrated entrance timeline.
 *
 * Pulled out of Landing.jsx once a second and third page needed the exact
 * same behaviour — this is the one place that logic lives now.
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

/** Elements that reveal themselves a beat after their section crosses 82%
 * up the viewport — the same restrained rise-and-fade used everywhere else
 * in the app, just driven by scroll position instead of page load. */
const REVEAL_SELECTOR = [
  '.section-head', '.landing-section-lede',
  '.landing-facts > *', '.landing-steps > *', '.landing-values > *',
  '.stats > .stat', '.feed > .alert',
  '.landing-features > .landing-feature',
  '.landing-detections > .landing-det',
  '.landing-specs > *', '.landing-price-card', '.landing-faq > *',
  '.landing-story p',
  '.landing-final-headline', '.landing-final > .landing-sub', '.landing-final .landing-cta',
].join(', ')

export function useLandingReveal(rootRef, { hero = false } = {}) {
  useLayoutEffect(() => {
    // Reduced-motion readers get the finished page instantly - no timeline,
    // no scroll triggers, nothing GSAP needs the CSS killswitch for.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const ctx = gsap.context(() => {
      if (hero) {
        // fromTo, not from: a plain .from() leaves elements pinned at
        // their start values when ScrollTrigger refreshes (which it does
        // on load, once fonts settle). An explicit end state can't stick.
        gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } })
          .fromTo('.landing-hero .label', { opacity: 0, y: 14 }, { opacity: 1, y: 0 })
          .fromTo('.landing-headline', { opacity: 0, y: 22 }, { opacity: 1, y: 0 }, '-=0.65')
          .fromTo('.landing-sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, '-=0.6')
          .fromTo('.landing-price-line', { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, '-=0.55')
          .fromTo('.landing-hero .landing-cta .btn',
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, stagger: 0.1 }, '-=0.5')
          .fromTo('.landing-hero .hero-mark',
            { opacity: 0, scale: 0.94 },
            { opacity: 0.035, scale: 1, duration: 1.4 }, 0)

        gsap.to('.landing-hero .hero-mark', {
          yPercent: 16,
          ease: 'none',
          scrollTrigger: { trigger: '.landing-hero', start: 'top top', end: 'bottom top', scrub: true },
        })
      } else {
        // Sub-pages get a lighter version of the same idea: the page head's
        // watermark and title settle in on load rather than staying static.
        gsap.fromTo('.landing-page-head .page-mark',
          { opacity: 0, scale: 0.94 },
          { opacity: 0.035, scale: 1, duration: 1.2, ease: 'power3.out' })
        gsap.fromTo('.landing-page-head > div',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      }

      // Every section reveals its contents the same restrained way, a beat
      // after it's 82% of the way up the viewport.
      gsap.utils.toArray('.landing-section').forEach((section) => {
        const targets = section.querySelectorAll(REVEAL_SELECTOR)
        if (!targets.length) return
        gsap.fromTo(targets,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            stagger: 0.08,
            scrollTrigger: { trigger: section, start: 'top 82%' },
          })
      })

      // Numeric stats (the illustrative demo preview) count up from zero.
      gsap.utils.toArray('.landing-stat-count').forEach((el) => {
        gsap.fromTo(el, { textContent: 0 }, {
          textContent: Number(el.dataset.count),
          duration: 1.1,
          ease: 'power1.out',
          snap: { textContent: 1 },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        })
      })
    }, rootRef)

    // Undoes every tween and ScrollTrigger this created - essential, since
    // otherwise they'd keep listening to scroll on pages that follow this one.
    return () => ctx.revert()
  }, [hero])
}
