import { describe, it, expect } from 'vitest'
import { timeline } from '../src/data/timeline'
import { locales } from '../src/i18n/ui'

/** True when `v` is an object with a non-empty string for every locale. */
const isText = (v: unknown): boolean =>
  locales.every(
    (l) => typeof (v as Record<string, unknown>)?.[l] === 'string' && (v as Record<string, string>)[l].trim().length > 0,
  )

describe('timeline data', () => {
  it('has at least one season', () => {
    expect(timeline.length).toBeGreaterThan(0)
  })

  it('has a unique id for every season', () => {
    const ids = timeline.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a unique id for every phase across the whole timeline', () => {
    const ids = timeline.flatMap((s) => s.phases.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tags every season as era v1 or v2', () => {
    for (const s of timeline) expect(['v1', 'v2']).toContain(s.era)
  })

  it('orders all v1 seasons before all v2 seasons', () => {
    const eras = timeline.map((s) => s.era)
    const firstV2 = eras.indexOf('v2')
    if (firstV2 !== -1) expect(eras.slice(firstV2).every((e) => e === 'v2')).toBe(true)
  })

  it('has every locale for each season title, subtitle and tag', () => {
    for (const s of timeline) {
      expect(isText(s.title), `${s.id} title`).toBe(true)
      expect(isText(s.subtitle), `${s.id} subtitle`).toBe(true)
      expect(isText(s.tag), `${s.id} tag`).toBe(true)
    }
  })

  it('has every locale for each phase date, title, summary and detail', () => {
    for (const s of timeline) {
      for (const p of s.phases) {
        expect(isText(p.date), `${p.id} date`).toBe(true)
        expect(isText(p.title), `${p.id} title`).toBe(true)
        expect(isText(p.summary), `${p.id} summary`).toBe(true)
        expect(isText(p.detail), `${p.id} detail`).toBe(true)
      }
    }
  })

  it('marks every v2 season as future', () => {
    for (const s of timeline) {
      if (s.era === 'v2') expect(s.future).toBe(true)
    }
  })

  it('only ever flags a v2 season as a sketch', () => {
    for (const s of timeline) {
      if (s.sketch) expect(s.era).toBe('v2')
    }
  })
})
