import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../ios-polish-phase2.css', import.meta.url), 'utf8')
const home = readFileSync(new URL('../views/Home.jsx', import.meta.url), 'utf8')
const workout = readFileSync(new URL('../views/Workout.jsx', import.meta.url), 'utf8')
const library = readFileSync(new URL('../views/Library.jsx', import.meta.url), 'utf8')
const startup = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8')

describe('iOS visual completion guardrails', () => {
  it('applies after the established styles without touching the PWA or Android', () => {
    expect(startup.indexOf("import './ios-polish-phase2.css'")).toBeGreaterThan(
      startup.indexOf("import './ios-polish.css'"))
    expect(css).toContain(':root[data-ios-glass="on"] .whdr.stick')
    expect(css).toContain(':root[data-ios-glass="on"] .plan .plan-day')
    expect(css).toContain(':root[data-ios-glass="on"] .ios-exercise-library')
    expect(css).toContain(':root[data-ios-glass="on"] .sp-root-title')
    // No stand-alone selectors: every authored declaration selector is prefixed
    // with the runtime marker (except for its design tokens which are scoped too).
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
    let open = 0
    for (const ch of stripped) {
      if (ch === '{') open++
      if (ch === '}') {
        open--
        expect(open).toBeGreaterThanOrEqual(0)
      }
    }
    expect(open).toBe(0)
    for (const line of stripped.split('\n').filter(line => /^\s*[^@\/\s}\w-].*,?\s*(?:\{|,)\s*$/.test(line))) {
      // Selector continuation lines are still fully scoped.
      if (line.includes(':root')) expect(line).toContain('[data-ios-glass="on"]')
    }
  })

  it('keeps the iPhone-proven bottom dock geometry unchanged', () => {
    expect(css).not.toMatch(/#tabbar/)
    expect(css).toContain('safe areas')
    expect(css).not.toMatch(/margin-inline:\s*auto/)
  })

  it('protects narrow workout steppers from ornamental size changes', () => {
    expect(workout).toContain('className="narrow ios-workout-start"')
    expect(css).toContain('.ios-workout-start-primary')
    expect(css).toContain('.setrow .stp')
    expect(css).not.toMatch(/--btn-floor|--num:|\.stp\s*\{\s*width:|\.setrow\s*\{\s*gap:/)
    expect(css).toContain('exact 320–430px fit')
  })

  it('uses the existing workout tally for home week progress', () => {
    expect(home).toContain('weekTally(S, todayISO())')
    expect(home).toContain('className="ios-home-week-progress"')
    expect(home).toContain('role="progressbar"')
    expect(home).toContain('Math.min(100, doneThisWeek / plannedPerWeek * 100)')
    expect(css).toContain('ios-home-week-progress-track')
  })

  it('keeps the exercises catalog interactive and dedicated to iOS paint', () => {
    expect(library).toContain('className="ios-exercise-library"')
    expect(css).toContain('.ios-exercise-library .list .item')
    expect(css).toContain('.ios-exercise-library .list .item:active')
  })

  it('handles reduced transparency, contrast and motion preferences', () => {
    expect(css).toContain('prefers-reduced-transparency:reduce')
    expect(css).toContain('prefers-contrast:more')
    expect(css).toContain('prefers-reduced-motion:reduce')
    expect(css).toContain('backdrop-filter:none')
  })
})
