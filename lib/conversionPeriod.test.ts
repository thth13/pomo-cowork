import test from 'node:test'
import assert from 'node:assert/strict'
import { conversionMetrics, conversionPercent, defaultConversionPeriod, isCalendarDate, kyivDate } from './conversionPeriod'

test('default cohort is exactly seven full Kyiv days, excluding today', () => {
  assert.deepEqual(defaultConversionPeriod(new Date('2026-11-16T12:00:00Z')), { start: '2026-11-09', end: '2026-11-15' })
  // Already the following calendar day in Kyiv, despite the UTC date.
  assert.equal(kyivDate(new Date('2026-11-16T22:30:00Z')), '2026-11-17')
  assert.deepEqual(defaultConversionPeriod(new Date('2026-11-16T22:30:00Z')), { start: '2026-11-10', end: '2026-11-16' })
})

test('calendar periods cross leap days, DST and year boundaries without losing dates', () => {
  assert.deepEqual(defaultConversionPeriod(new Date('2026-01-02T12:00:00Z')), { start: '2025-12-26', end: '2026-01-01' })
  assert.deepEqual(defaultConversionPeriod(new Date('2024-03-02T12:00:00Z')), { start: '2024-02-24', end: '2024-03-01' })
  assert.deepEqual(defaultConversionPeriod(new Date('2026-03-30T12:00:00Z')), { start: '2026-03-23', end: '2026-03-29' })
  assert.deepEqual(defaultConversionPeriod(new Date('2026-10-26T12:00:00Z')), { start: '2026-10-19', end: '2026-10-25' })
})

test('invalid dates are rejected rather than silently rolling into another month', () => {
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-1-01', '2026-11-16T00:00:00Z', '', null]) assert.equal(isCalendarDate(value), false)
  for (const value of ['2024-02-29', '2026-11-16', '0001-01-01']) assert.equal(isCalendarDate(value), true)
})

test('empty cohorts have no conversion percentage, while genuine zero stays zero', () => {
  assert.equal(conversionPercent(0, 0), null)
  assert.equal(conversionPercent(0, 10), 0)
  assert.equal(conversionPercent(1, 4), 25)
  assert.equal(conversionPercent(10, 10), 100)
})

test('upgrading a visitor to anonymous and then registered preserves the denominator', () => {
  const initial = conversionMetrics({ newVisitors: 100, anonymous: 0, registered: 0, active: 0 })
  const anonymous = conversionMetrics({ newVisitors: 70, anonymous: 30, registered: 0, active: 0 })
  const registered = conversionMetrics({ newVisitors: 70, anonymous: 20, registered: 10, active: 15 })
  assert.equal(initial.visitors, 100)
  assert.equal(anonymous.visitors, 100)
  assert.equal(registered.visitors, 100)
  assert.equal(registered.profiles, 30)
  assert.equal(registered.visitToAnonymous, 30)
  assert.equal(registered.visitToRegistered, 10)
  assert.equal(registered.anonymousToRegistered, 10 / 30 * 100)
  assert.equal(registered.activeConversion, 15)
})

test('empty visitor and profile groups do not produce NaN or infinity', () => {
  const empty = conversionMetrics({ newVisitors: 0, anonymous: 0, registered: 0, active: 0 })
  assert.equal(empty.activeConversion, null)
  assert.equal(empty.visitToAnonymous, null)
  assert.equal(empty.anonymousToRegistered, null)
  const guestsOnly = conversionMetrics({ newVisitors: 5, anonymous: 0, registered: 0, active: 0 })
  assert.equal(guestsOnly.visitToAnonymous, 0)
  assert.equal(guestsOnly.anonymousToRegistered, null)
})
