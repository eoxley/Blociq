import { describe, it, expect } from 'vitest'
import { normaliseText, canonicaliseCategory, canonicaliseTitle, deriveFrequencyLabel, normalisedPair } from './normalise'

describe('normaliseText', () => {
  it('should normalise text correctly', () => {
    expect(normaliseText('Fire Risk Assessment')).toBe('fire risk assessment')
    expect(normaliseText('EICR (Communal fixed wiring)')).toBe('eicr communal fixed wiring')
    expect(normaliseText('Lifts & Access')).toBe('lifts and access')
    expect(normaliseText('Water Hygiene')).toBe('water hygiene')
    expect(normaliseText('Gas Safety')).toBe('gas safety')
  })

  it('should handle special characters', () => {
    expect(normaliseText('Fire–Risk Assessment')).toBe('fire-risk assessment')
    expect(normaliseText('Lift/Platform')).toBe('lift platform')
    expect(normaliseText('Emergency Lighting (3-hour)')).toBe('emergency lighting 3-hour')
  })

  it('should handle null/undefined', () => {
    expect(normaliseText(undefined)).toBe('')
    expect(normaliseText(null)).toBe('')
    expect(normaliseText('')).toBe('')
  })
})

describe('canonicaliseCategory', () => {
  it('should canonicalise categories correctly', () => {
    expect(canonicaliseCategory('Lifts')).toBe('Lifts & Access')
    expect(canonicaliseCategory('Lift')).toBe('Lifts & Access')
    expect(canonicaliseCategory('Water')).toBe('Water Hygiene')
    expect(canonicaliseCategory('Gas Safety')).toBe('Gas & HVAC')
    expect(canonicaliseCategory('Asbestos Survey')).toBe('Asbestos')
  })

  it('should preserve non-aliased categories', () => {
    expect(canonicaliseCategory('Fire Safety')).toBe('Fire Safety')
    expect(canonicaliseCategory('Electrical')).toBe('Electrical')
    expect(canonicaliseCategory('Insurance')).toBe('Insurance')
  })
})

describe('canonicaliseTitle', () => {
  it('should canonicalise titles correctly', () => {
    expect(canonicaliseTitle('FRA')).toBe('Fire Risk Assessment (FRA)')
    expect(canonicaliseTitle('fire risk assessment')).toBe('Fire Risk Assessment (FRA)')
    expect(canonicaliseTitle('EICR')).toBe('Electrical Installation Condition Report (EICR)')
    expect(canonicaliseTitle('electrical installation condition report')).toBe('Electrical Installation Condition Report (EICR)')
  })

  it('should handle special cases', () => {
    expect(canonicaliseTitle('Lift autodial')).toBe('Lift Autodialler – Functional Test (EN 81-28)')
    expect(canonicaliseTitle('Building Insurance Certificate')).toBe('Buildings Insurance – Policy & Certificate (Annual)')
    expect(canonicaliseTitle('Legionella Risk Assessment')).toBe('Legionella Risk Assessment (LRA)')
  })

  it('should preserve non-aliased titles', () => {
    expect(canonicaliseTitle('Fire Extinguishers')).toBe('Fire Extinguishers')
    expect(canonicaliseTitle('Emergency Lighting')).toBe('Emergency Lighting')
    expect(canonicaliseTitle('Gas Safety Certificate')).toBe('Gas Safety Certificate')
  })
})

describe('deriveFrequencyLabel', () => {
  it('should derive frequency labels from months', () => {
    expect(deriveFrequencyLabel(1)).toBe('Monthly')
    expect(deriveFrequencyLabel(3)).toBe('Quarterly')
    expect(deriveFrequencyLabel(6)).toBe('6-Monthly')
    expect(deriveFrequencyLabel(12)).toBe('Annual')
    expect(deriveFrequencyLabel(24)).toBe('2-Yearly')
    expect(deriveFrequencyLabel(36)).toBe('3-Yearly')
    expect(deriveFrequencyLabel(60)).toBe('5-Yearly')
    expect(deriveFrequencyLabel(120)).toBe('10-Yearly')
  })

  it('should return existing label if provided', () => {
    expect(deriveFrequencyLabel(12, 'Annual')).toBe('Annual')
    expect(deriveFrequencyLabel(6, '6-Monthly')).toBe('6-Monthly')
    expect(deriveFrequencyLabel(1, 'Monthly')).toBe('Monthly')
  })

  it('should handle edge cases', () => {
    expect(deriveFrequencyLabel(null)).toBe(null)
    expect(deriveFrequencyLabel(undefined)).toBe(null)
    expect(deriveFrequencyLabel(99)).toBe(null) // Unknown frequency
    expect(deriveFrequencyLabel(12, '')).toBe('Annual') // Empty string label
    expect(deriveFrequencyLabel(12, '   ')).toBe('Annual') // Whitespace label
  })
})

describe('normalisedPair', () => {
  it('should return normalised category and title pair', () => {
    const result = normalisedPair('Lifts', 'FRA')
    expect(result.normCategory).toBe('lifts and access')
    expect(result.normTitle).toBe('fire risk assessment fra')
  })

  it('should handle non-aliased inputs', () => {
    const result = normalisedPair('Fire Safety', 'Emergency Lighting')
    expect(result.normCategory).toBe('fire safety')
    expect(result.normTitle).toBe('emergency lighting')
  })
})

describe('Integration tests', () => {
  it('should handle EICR variations', () => {
    const variations = [
      'EICR',
      'EICR (Communal fixed wiring)',
      'Electrical Installation Condition Report'
    ]
    
    const canonicalised = variations.map(v => canonicaliseTitle(v))
    const normalised = canonicalised.map(v => normaliseText(v))
    
    // All should normalise to the same text
    expect(normalised[0]).toBe(normalised[1])
    expect(normalised[1]).toBe(normalised[2])
  })

  it('should handle category variations', () => {
    const variations = ['Lifts', 'Lift', 'Lifts & Access']
    
    const canonicalised = variations.map(v => canonicaliseCategory(v))
    
    // All should canonicalise to the same category
    expect(canonicalised[0]).toBe('Lifts & Access')
    expect(canonicalised[1]).toBe('Lifts & Access')
    expect(canonicalised[2]).toBe('Lifts & Access')
  })
})
