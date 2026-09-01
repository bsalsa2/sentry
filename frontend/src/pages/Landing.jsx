/**
 * The public landing page — what a visitor sees before they ever sign in.
 * Static and illustrative throughout; nothing here calls the API.
 *
 * NOTE for whoever fills in the real numbers: the price ($249), the deposit
 * ($25), the ship date, and every spec below are placeholders written to be
 * structurally correct, not factually correct. Swap them for the real
 * figures before this goes live — search this file for "PLACEHOLDER".
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import PillNav from '../components/PillNav'
import {
  ArrowIcon, CameraIcon, ChipIcon, DropIcon, EyeIcon, ShieldIcon, TagIcon, iconFor,
} from '../components/icons'
import { DETECTION_TYPES, detection } from '../utils/detections'

gsap.registerPlugin(ScrollTrigger)

/** Elements that reveal themselves, one beat after the section they belong
 * to crosses into view — the same restrained rise-and-fade used everywhere
 * else in the app, just driven by scroll position instead of page load. */
const REVEAL_SELECTOR = [
  '.section-head', '.landing-section-lede',
  '.landing-facts > *', '.landing-steps > *',
  '.stats > .stat', '.feed > .alert',
  '.landing-features > .landing-feature',
  '.landing-detections > .landing-det',
  '.landing-specs > *', '.landing-price-card', '.landing-faq > *',
  '.landing-final-headline', '.landing-final > .landing-sub', '.landing-final .landing-cta',
].join(', ')

const NAV_ITEMS = [
  { label: 'Overview', Icon: ShieldIcon, href: '#top' },
  { label: 'How it works', Icon: CameraIcon, href: '#how' },
  { label: 'Specs', Icon: ChipIcon, href: '#specs' },
  { label: 'Pricing', Icon: TagIcon, href: '#pricing' },
  { label: 'Reserve', Icon: ArrowIcon, href: '/signup' },
]

const FACTS = [
  { label: '2K HDR sensor', Icon: CameraIcon },
  { label: 'Color night vision', Icon: EyeIcon },
  { label: 'IP66 weatherproof', Icon: DropIcon },
  { label: 'On-device AI', Icon: ChipIcon },
]

const STEPS = [
  {
    n: '01',
    title: 'Mount it',
    body: 'Screw the bracket above the door, or set it on a shelf inside — it’s weatherproof either way. There’s no separate hub to drill into drywall for; the camera is the whole system.',
  },
  {
    n: '02',
    title: 'Connect it',
    body: 'It joins your Wi-Fi and pairs with your Sentry account straight from your phone. No bridge box, no third app to install, no hold music with support.',
  },
  {
    n: '03',
    title: 'It watches, quietly',
    body: 'Every motion event runs through on-device AI before it ever reaches your phone. A moth on the lens doesn’t wake you up. A stranger at the door at 2am does.',
  },
]

const FEATURES = [
  {
    title: 'Your network. Your data.',
    body: 'Detection runs on the camera itself. Nothing about what it sees has to leave your house for it to know a stranger from a delivery.',
  },
  {
    title: 'A key per camera, rotate anytime.',
    body: 'Every camera authenticates with its own key. Sell a house, have a falling-out with a housemate, lose a device — revoke one key without touching the rest.',
  },
  {
    title: 'Tuned, not just triggered.',
    body: 'Sensitivity is a dial, not a switch. Turn it down to a whisper for a mail slot, up to a shout for a driveway.',
  },
]

const SPECS = [
  ['Sensor', '2K HDR, up to 30 fps'],
  ['Field of view', '155° diagonal'],
  ['Night vision', 'Full-colour low light, IR fallback'],
  ['Connectivity', '2.4 / 5GHz Wi-Fi · PoE adapter optional'],
  ['Power', 'USB-C · weatherproof battery pack optional'],
  ['Storage', 'Local microSD included · cloud backup optional'],
  ['Weather rating', 'IP66 · ‒20°C to 50°C operating range'],
  ['On-device AI', 'Person, vehicle, package, animal, motion'],
  ['App', 'iOS, Android, and the web console shown below'],
  ['Warranty', '2 years, first owner'],
]

const PRICING_INCLUDES = [
  'The camera and weatherproof mounting bracket',
  'The app, free, on iOS, Android and the web',
  'On-device AI detection — included, not a paywall',
  '14 days of local event history',
]

const FAQ = [
  {
    q: 'Do I need a subscription?',
    a: 'No. Detection, alerts, and 14 days of local event history are included with the camera itself. Cloud backup beyond that is optional, never required to get an alert.',
  },
  {
    q: 'When does it ship?',
    a: 'We’re finishing testing now — this page is here early on purpose. Reserving a spot gets you the ship-date announcement first and holds your place in line.',
  },
  {
    q: 'What if it isn’t right for my home?',
    a: 'Full refund within 30 days of delivery. No restocking fee, no argument.',
  },
  {
    q: 'Can I run more than one?',
    a: 'Yes — one account covers as many Sentry cameras as your house needs, all in the same app.',
  },
]

export default function Landing() {
  const PackageIcon = iconFor('package')
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    // Reduced-motion readers get the finished page instantly - no timeline,
    // no scroll triggers, nothing GSAP needs the CSS killswitch for.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const ctx = gsap.context(() => {
      // --- Hero: one orchestrated reveal on load. ---
      // fromTo, not from, throughout this file: a plain .from() leaves
      // elements pinned at their start values when ScrollTrigger refreshes
      // (which it does on load, once fonts settle). An explicit end state
      // can't get stuck that way.
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

      // The watermark drifts a little slower than the page — a whisper of
      // depth, not a gimmick.
      gsap.to('.landing-hero .hero-mark', {
        yPercent: 16,
        ease: 'none',
        scrollTrigger: { trigger: '.landing-hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      // --- Every section reveals its contents the same restrained way,
      //     a beat after it's 82% of the way up the viewport. ---
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

      // --- The demo's numeric stats count up from zero as they arrive. ---
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
  }, [])

  return (
    <div id="top" className="landing" ref={rootRef}>
      <header className="landing-nav">
        <a href="#top" className="brand">
          <ShieldIcon />
          SENTRY
        </a>
        <PillNav items={NAV_ITEMS} />
      </header>

      {/* --- Hero ------------------------------------------------------- */}
      <section className="landing-hero">
        <ShieldIcon className="hero-mark" aria-hidden="true" />
        <div className="label">Sentry Camera — reserving now</div>
        <h1 className="landing-headline">
          A camera that watches your door<br />and just tells you what happened.
        </h1>
        <p className="landing-sub">
          Sentry is a standalone security camera with the thinking built in — not a
          subscription you rent. It knows the difference between a delivery and a
          stranger, a raccoon and a break-in, and says so in one sentence instead of
          a folder of clips you'll never watch.
        </p>
        <p className="landing-price-line">
          <strong>$249</strong> one-time <span className="dim">·</span> reserve with a
          fully refundable $25 deposit
        </p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Reserve yours</Link>
          <a href="#specs" className="btn">See full specs</a>
        </div>

        <div className="landing-facts">
          {FACTS.map(({ label, Icon }) => (
            <div key={label} className="landing-fact">
              <Icon />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- How it works ------------------------------------------------- */}
      <section id="how" className="section landing-section">
        <div className="section-head">
          <span className="label">How it works</span>
          <h2>Fifteen minutes, no hub required</h2>
        </div>

        <div className="landing-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Illustrative preview ---------------------------------------- */}
      <section id="demo" className="section landing-section">
        <div className="section-head">
          <span className="label">The app it comes with</span>
          <h2>What it looks like at 2am</h2>
        </div>
        <p className="landing-section-lede">
          Every Sentry camera includes this app — no extra download, no separate
          account tier. What's below is an illustrative preview, not live data.
        </p>

        <div className="stats">
          <div className="stat">
            <div className="label">Cameras online</div>
            <div className="stat-value tabular">3/3</div>
            <div className="stat-sub">all reporting</div>
          </div>
          <div className="stat">
            <div className="label">Detections 24h</div>
            <div className="stat-value tabular landing-stat-count" data-count="21">0</div>
            <div className="stat-sub">across all cameras</div>
          </div>
          <div className="stat">
            <div className="label">Unreviewed</div>
            <div className="stat-value tabular landing-stat-count" data-count="0" style={{ '--stat-ink': 'var(--ok)' }}>0</div>
            <div className="stat-sub">all clear</div>
          </div>
          <div className="stat">
            <div className="label">People 24h</div>
            <div className="stat-value tabular landing-stat-count" data-count="6">0</div>
            <div className="stat-sub">person detections</div>
          </div>
        </div>

        <div className="feed" style={{ marginTop: '1px' }}>
          <div className="alert" style={{ '--tone': 'var(--d-package)' }}>
            <span className="alert-ico"><PackageIcon /></span>
            <div className="alert-main">
              <div className="alert-what">A parcel arrived at Front Door</div>
              <div className="alert-where">Front Door · 88% confident</div>
            </div>
            <div className="alert-side"><div className="alert-when tabular">2:13 PM</div></div>
          </div>
        </div>
      </section>

      {/* --- Detections ------------------------------------------------------ */}
      <section id="detections" className="section landing-section">
        <div className="section-head">
          <span className="label">Detections</span>
          <h2>Five things worth knowing about</h2>
        </div>
        <p className="landing-section-lede">
          Each type carries its own colour and its own icon, so colour never has to
          do the job alone — the same validated palette runs through the whole app.
          It's also the difference between one alert that matters and twenty that don't.
        </p>

        <div className="landing-detections">
          {DETECTION_TYPES.map((type) => {
            const meta = detection(type)
            const Icon = iconFor(type)
            return (
              <div key={type} className="landing-det" style={{ '--tone': meta.color }}>
                <span className="landing-det-ico"><Icon /></span>
                <span className="landing-det-label">{meta.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* --- Specs ------------------------------------------------------ */}
      <section id="specs" className="section landing-section">
        <div className="section-head">
          <span className="label">Specification</span>
          <h2>What's actually inside</h2>
        </div>
        <p className="landing-section-lede">
          Numbers as they stand today, mid-testing — final specs lock before the
          first units ship.
        </p>

        <div className="landing-specs">
          {SPECS.map(([label, value]) => (
            <div key={label} className="landing-spec-row">
              <span className="landing-spec-label">{label}</span>
              <span className="landing-spec-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- Security ------------------------------------------------------ */}
      <section id="security" className="section landing-section">
        <div className="section-head">
          <span className="label">Security</span>
          <h2>Built to stay out of the way</h2>
        </div>

        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Pricing ------------------------------------------------------ */}
      <section id="pricing" className="section landing-section">
        <div className="section-head">
          <span className="label">Pricing</span>
          <h2>One camera. One price.</h2>
        </div>

        <div className="landing-price-card">
          <div className="landing-price-top">
            <div>
              <div className="landing-price-n">$249</div>
              <div className="landing-price-sub">one-time · no forced subscription</div>
            </div>
            <Link to="/signup" className="btn btn-go">Reserve with $25 deposit</Link>
          </div>

          <div className="rule" />

          <ul className="landing-price-list">
            {PRICING_INCLUDES.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <p className="hint">
            Optional cloud backup starts at $4/mo if you want 30-day off-site
            history — never required to receive an alert. Deposit is fully
            refundable any time before your camera ships.
          </p>
        </div>
      </section>

      {/* --- FAQ ------------------------------------------------------ */}
      <section className="section landing-section">
        <div className="section-head">
          <span className="label">Questions</span>
          <h2>Before you reserve</h2>
        </div>

        <div className="landing-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="landing-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Final CTA ------------------------------------------------------ */}
      <section className="section landing-section landing-final">
        <h2 className="landing-final-headline">Be one of the first through the door.</h2>
        <p className="landing-sub">Reserve now for $249, refundable anytime before it ships.</p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Reserve yours</Link>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="brand"><ShieldIcon />SENTRY</span>
        <span className="label">© {new Date().getFullYear()} · Watching, quietly</span>
      </footer>
    </div>
  )
}
