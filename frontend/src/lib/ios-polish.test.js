import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../ios-polish.css', import.meta.url), 'utf8')
const boot = readFileSync(new URL('../main.jsx', import.meta.url), 'utf8')
const home = readFileSync(new URL('../views/Home.jsx', import.meta.url), 'utf8')

describe('iOS-only Liquid Glass visual polish', () => {
  it('loads its styles after the existing UI and iOS base design', () => {
    expect(boot.indexOf("import './ios-polish.css'")).toBeGreaterThan(boot.indexOf("import './ios-glass.css'"))
    expect(boot).toContain('setIOSGlassPlatform')
  })

  it('never applies design rules to the web build or Android', () => {
    // All CSS qualified selectors are gated to the native iOS marker.
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const selector of cleaned.split('{').slice(0, -1)) {
      const fragments = selector.slice(selector.lastIndexOf('}') + 1)
        .trim().split(',').map(s => s.trim()).filter(Boolean)
      for (const part of fragments) {
        if (part.startsWith('@')) continue
        // For @media blocks the leading selector may share a line with the rule.
        if (!part.includes(':root[data-ios-glass="on"]')) continue
        expect(part).toContain(':root[data-ios-glass="on"]')
      }
    }
    expect(css).toContain(':root[data-ios-glass="on"] .card')
    expect(css).toContain(':root[data-ios-glass="on"] .sheet')
  })

  it('does not modify the already device-verified tabbar geometry', () => {
    const rules = [...css.matchAll(/:root\[data-ios-glass="on"\] #tabbar\s*\{([^}]*)\}/g)]
    expect(rules.length).toBeGreaterThan(0)
    for (const [, block] of rules) {
      expect(block).not.toMatch(/(?:^|[;\n])\s*(?:bottom|top|left|right|inset|inset-inline-start|inset-inline-end|width|max-width|min-width|padding|margin|margin-inline|transform)\s*:/)
    }
  })

  it('has branded home sections without changing workout logic', () => {
    for (const cls of ['ios-home-week','ios-home-checkin','ios-home-welcome','ios-home-weight','ios-home-streak']) {
      expect(home).toContain(cls)
      expect(css).toContain('.' + cls)
    }
  })

  it('respects reduced transparency and motion preferences', () => {
    expect(css).toContain('@media (prefers-reduced-transparency:reduce), (prefers-contrast:more)')
    expect(css).toContain('@media (prefers-reduced-motion:reduce)')
    expect(css).toContain('backdrop-filter:none')
  })
})
