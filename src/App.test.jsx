import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App, { buildRecoveryNote, paymentIssues, resultPlans, situations } from './App.jsx'

const cases = [
  ['PAYMENT_PENDING', 'Payment is pending'],
  ['DEBITED_STATUS_PENDING', 'Money debited, status pending'],
  ['DUPLICATE_DEBIT', 'Debited more than once'],
  ['RECEIPT_REQUIRED', 'I need my receipt'],
  ['RESOLVED_HANDOFF_REQUIRED', 'Licence or RC approved but not received'],
]

function setCase(state) {
  sessionStorage.setItem('clearpath-flow', JSON.stringify({
    category: state.startsWith('PAYMENT_') || state.includes('DEBIT') ? 'payment' : state,
    situation: state,
    reference: 'TEST-123',
    state: 'Delhi',
    date: '2026-08-23',
  }))
}

function renderResult(state) {
  setCase(state)
  return render(<MemoryRouter initialEntries={['/result']}><App /></MemoryRouter>)
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test-note'), revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each([
  ['/welcome', 'Stuck with a vehicle or driving licence service?'],
  ['/situation-selector', 'What’s going wrong?'],
  ['/minimal-details', 'Help us narrow it down'],
  ['/diagnostic', 'We found a clear path forward'],
])('%s heading hierarchy', (route, mainHeading) => {
  it('has exactly one h1 for the screen title', () => {
    render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: mainHeading })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe.each(cases)('%s result', (state, statusLabel) => {
  it('shows the correct plain-language status and state-specific checklist', () => {
    renderResult(state)
    expect(screen.getByRole('heading', { level: 1, name: statusLabel })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const step of resultPlans[state]) {
      expect(screen.getByText(step.title)).toBeInTheDocument()
      expect(screen.getByText(step.text)).toBeInTheDocument()
    }
  })

  it('shows the do-not-pay warning only for debit reconciliation states', () => {
    renderResult(state)
    const warning = screen.queryByText('DO NOT PAY AGAIN YET')
    if (['DEBITED_STATUS_PENDING', 'DUPLICATE_DEBIT'].includes(state)) expect(warning).toBeInTheDocument()
    else expect(warning).not.toBeInTheDocument()
  })

  it('generates and downloads a printable recovery note', async () => {
    const user = userEvent.setup()
    renderResult(state)
    await user.click(screen.getByRole('button', { name: /download recovery note/i }))
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    const note = buildRecoveryNote(JSON.parse(sessionStorage.getItem('clearpath-flow')))
    expect(note).toContain(statusLabel)
    expect(note).toContain('Delhi')
    expect(note).toContain(resultPlans[state][0].title)
    expect(note).toContain('window.print()')
  })
})

it('returns from the payment follow-up to the top-level situation selector', async () => {
  const user = userEvent.setup()
  sessionStorage.setItem('clearpath-flow', JSON.stringify({ category: 'payment', situation: '' }))
  render(<MemoryRouter initialEntries={['/situation-selector']}><App /></MemoryRouter>)

  await user.click(screen.getByRole('button', { name: /choose a different situation/i }))

  for (const situation of situations) expect(screen.getByText(situation.title)).toBeInTheDocument()
  expect(screen.getByText('1 / 3')).toBeInTheDocument()
  expect(screen.queryByText('YOUR NEXT STEP, MADE CLEAR')).not.toBeInTheDocument()
  expect(screen.queryByText(paymentIssues[0].title)).not.toBeInTheDocument()
})

it('fully resets a completed case before starting a new one', async () => {
  const user = userEvent.setup()
  setCase('DEBITED_STATUS_PENDING')
  render(<MemoryRouter initialEntries={['/result']}><App /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: 'Money debited, status pending' })).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Start over' }))
  await user.click(screen.getByRole('link', { name: 'Find my next step' }))

  for (const situation of situations) expect(screen.getByText(situation.title)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'What’s going wrong?' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Which payment issue applies?' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /I need my receipt/i }))
  await user.click(screen.getByRole('button', { name: /Continue/i }))

  expect(screen.getByLabelText(/Application or receipt number/i)).toHaveValue('')
  expect(screen.getByLabelText(/State or UT/i)).toHaveValue('')
  expect(screen.getByLabelText(/When did you apply/i)).toHaveValue('')
})
