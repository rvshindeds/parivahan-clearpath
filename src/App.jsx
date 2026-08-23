import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

const FlowContext = createContext(null)
const emptyFlow = { category: '', situation: '', reference: '', state: '', date: '' }
const toLocalDateValue = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const situations = [
  { id: 'payment', icon: '₹', title: 'Payment issue', text: 'Pending, debited but not updated, or debited twice' },
  { id: 'RECEIPT_REQUIRED', icon: '▤', title: 'I need my receipt', text: 'Find or recover a payment receipt' },
  { id: 'RESOLVED_HANDOFF_REQUIRED', icon: '↗', title: 'Licence or RC approved but not received', text: 'Approved, but the document has not arrived' },
]

export const paymentIssues = [
  { id: 'PAYMENT_PENDING', title: 'Payment is pending', text: 'The payment status still shows as pending' },
  { id: 'DEBITED_STATUS_PENDING', title: 'Money debited, status pending', text: 'Money left my account but the service has not updated' },
  { id: 'DUPLICATE_DEBIT', title: 'Debited more than once', text: 'I was charged twice for the same transaction' },
]

export const resultPlans = {
  PAYMENT_PENDING: [
    { title: 'Check the transaction status', text: 'Open the official Parivahan portal and use the payment or application status option for your service.', officialLink: true },
    { title: 'Wait for the pending payment to update', text: 'Do not start another payment while the first one is still pending. Check again after your bank has had time to process it.' },
    { title: 'Ask for help using your payment reference', text: 'If it remains pending, contact the relevant regional transport office (RTO) or portal support team with the application number, payment date, and bank reference.' },
  ],
  DEBITED_STATUS_PENDING: [
    { title: 'Save proof of the debit', text: 'Capture the bank transaction ID, amount, date, application number, and a screenshot showing that the application status has not updated.' },
    { title: 'Check the payment on the official portal', text: 'Use the official Parivahan payment-status option. Do not pay again while the earlier payment is being checked.', officialLink: true },
    { title: 'Ask for the payment to be traced', text: 'If the status remains unchanged, ask the relevant regional transport office (RTO) or portal support team to trace the payment using your bank reference.' },
  ],
  DUPLICATE_DEBIT: [
    { title: 'Document all debits', text: 'Save a bank statement or screenshots showing all transaction IDs, amounts, and timestamps for the same application.' },
    { title: 'Check which transaction was accepted', text: 'Verify the application and payment status on the official Parivahan portal before taking action.', officialLink: true },
    { title: 'Raise a duplicate-debit refund request', text: 'Send all bank references and the application number to the relevant RTO or portal helpdesk. Contact your bank if they confirm the extra debit was not accepted.' },
  ],
  RECEIPT_REQUIRED: [
    { title: 'Open the official receipt or payment-status flow', text: 'On the official Parivahan portal, choose your service and look for Print Receipt, Fee Receipt, or Verify Payment Status.', officialLink: true },
    { title: 'Retrieve the receipt using your reference', text: 'Enter the application or transaction number and payment date, then save or print the generated receipt.' },
    { title: 'Request a receipt copy if it cannot be retrieved', text: 'Contact the relevant RTO or portal helpdesk with the bank reference, amount, date, and application number.' },
  ],
  RESOLVED_HANDOFF_REQUIRED: [
    { title: 'Check dispatch or document status', text: 'Use the official Parivahan portal to confirm approval and look for a dispatch number, speed-post reference, or digital-document option.', officialLink: true },
    { title: 'Trace the handoff', text: 'If a postal reference exists, track it with the carrier. Otherwise, ask the issuing RTO whether the document is awaiting collection or dispatch.' },
    { title: 'Escalate the delivery gap', text: 'If approval is old and there is no handoff update, raise a grievance with the approval date, application number, address, and status screenshot.' },
  ],
}

export const resultRules = {
  PAYMENT_PENDING: 'You told us your payment still shows as pending, so these steps help you check whether it has finished processing before asking for help.',
  DEBITED_STATUS_PENDING: "You told us money left your account but the application has not updated. The payment may still be processing between your bank and the service.",
  DUPLICATE_DEBIT: 'You told us you were charged more than once, so these steps help you keep proof, identify the accepted payment, and ask for the extra charge back.',
  RECEIPT_REQUIRED: 'You told us you need a receipt, so these steps take you to the receipt or payment-history options before asking the RTO for a copy.',
  RESOLVED_HANDOFF_REQUIRED: 'You told us your licence or RC is approved but has not arrived, so these steps focus on dispatch, delivery, or collection from the RTO.',
}

export function buildRecoveryNote(flow) {
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
  const selected = [...situations, ...paymentIssues].find(item => item.id === flow.situation)
  const steps = resultPlans[flow.situation] || []
  const showPaymentWarning = ['DEBITED_STATUS_PENDING', 'DUPLICATE_DEBIT'].includes(flow.situation)
  const caseName = selected?.title || 'Your action plan'

  return `<!doctype html><html><head><meta charset="utf-8"><title>ClearPath recovery note</title><style>body{font:16px/1.5 Arial,sans-serif;max-width:760px;margin:48px auto;padding:0 24px;color:#173b31}h1{margin-bottom:4px}.meta{background:#f2f6f3;padding:16px;margin:24px 0}li{margin:16px 0}.warning{padding:14px;border:2px solid #b34222;background:#fff0e8;font-weight:bold}@media print{body{margin:0}.no-print{display:none}}</style></head><body><h1>Parivahan ClearPath recovery note</h1><p>Independent prototype — no live Parivahan connection.</p><div class="meta"><strong>Case:</strong> ${escapeHtml(caseName)}<br><strong>State / UT:</strong> ${escapeHtml(flow.state || 'Not provided')}<br><strong>Application date:</strong> ${escapeHtml(flow.date || 'Not provided')}<br><strong>Reference:</strong> ${escapeHtml(flow.reference || 'Not provided')}</div>${showPaymentWarning ? '<p class="warning">DO NOT PAY AGAIN YET — Do not make another payment until this status is verified.</p>' : ''}<h2>Recommended steps</h2><ol>${steps.map(step => `<li><strong>${escapeHtml(step.title)}</strong><br>${escapeHtml(step.text)}</li>`).join('')}</ol><h2>Why this result?</h2><p>${escapeHtml(resultRules[flow.situation] || 'This path was selected from the information you provided.')}</p><p><a href="https://parivahan.gov.in">Official Parivahan site</a></p><button class="no-print" onclick="window.print()">Print this note</button></body></html>`
}

function RouteFocus() {
  const { pathname } = useLocation()
  useEffect(() => { document.querySelector('main')?.focus() }, [pathname])
  return null
}

export function App() {
  const skipNextStorageWrite = useRef(false)
  const [flow, setFlow] = useState(() => {
    try {
      const savedFlow = sessionStorage.getItem('clearpath-flow')
      return savedFlow ? { ...emptyFlow, ...JSON.parse(savedFlow) } : emptyFlow
    } catch {
      return emptyFlow
    }
  })

  useEffect(() => {
    if (skipNextStorageWrite.current) {
      skipNextStorageWrite.current = false
      return
    }
    sessionStorage.setItem('clearpath-flow', JSON.stringify(flow))
  }, [flow])

  const resetFlow = () => {
    skipNextStorageWrite.current = true
    sessionStorage.removeItem('clearpath-flow')
    setFlow({ ...emptyFlow })
  }

  return (
    <FlowContext.Provider value={{ flow, setFlow, resetFlow }}>
      <div className="app-shell">
        <Disclaimer />
        <RouteFocus />
        <main tabIndex="-1">
          <Routes>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/situation-selector" element={<SituationSelector />} />
            <Route path="/minimal-details" element={<MinimalDetails />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/result" element={<Result />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>
      </div>
    </FlowContext.Provider>
  )
}

function Disclaimer() {
  return (
    <div className="disclaimer" role="note">
      <span aria-hidden="true">ⓘ</span>
      <span>Independent prototype — no live Parivahan connection.</span>
    </div>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <div className="brand-mark" aria-hidden="true"><span>↗</span></div>
      <div><strong>Parivahan</strong><span>ClearPath</span></div>
    </div>
  )
}

function Welcome() {
  return (
    <section className="screen welcome">
      <div className="welcome-top"><Brand /><span className="prototype-pill">HACKATHON PROTOTYPE</span></div>
      <div className="hero-art" aria-hidden="true">
        <div className="road road-one" /><div className="road road-two" />
        <div className="sign">CLEAR<br />PATH <span>→</span></div>
        <div className="car">▰</div>
      </div>
      <div className="hero-copy">
        <p className="eyebrow">YOUR NEXT STEP, MADE CLEAR</p>
        <h1>Stuck with a vehicle or driving licence service?</h1>
        <p>Answer a few simple questions. Get a clear, practical checklist for what to do next.</p>
        <Link className="button button--primary" to="/situation-selector">Find my next step <span aria-hidden="true">→</span></Link>
        <p className="privacy">◇ No login &nbsp;·&nbsp; Nothing leaves your device &nbsp;·&nbsp; Takes 2 minutes</p>
      </div>
    </section>
  )
}

function Header({ step, title }) {
  const navigate = useNavigate()
  return (
    <header className="flow-header">
      <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">←</button>
      <Brand compact />
      <span className="step" aria-hidden="true">{step} / 3</span>
      <div className="progress" role="progressbar" aria-label={`Step ${step} of 3`} aria-valuemin="1" aria-valuemax="3" aria-valuenow={step}><i style={{ width: `${(step / 3) * 100}%` }} /></div>
      {title && <p>{title}</p>}
    </header>
  )
}

function SituationSelector() {
  const { flow, setFlow } = useContext(FlowContext)
  const navigate = useNavigate()
  const choosingPaymentType = flow.category === 'payment'
  const screenHeading = useRef(null)
  const chooseCategory = id => {
    if (id === 'payment') setFlow({ ...flow, category: id, situation: '' })
    else setFlow({ ...flow, category: id, situation: id })
  }
  const returnToTopLevelSituations = () => {
    setFlow(currentFlow => ({ ...currentFlow, category: '', situation: '' }))
    navigate('/situation-selector', { replace: true })
  }
  useEffect(() => { screenHeading.current?.focus() }, [choosingPaymentType])
  return (
    <section className="screen flow-screen">
      <Header step={1} title="Choose the closest match. You can change this later." />
      <div className="content">
        <p className="eyebrow">LET'S START HERE</p>
        <h1 ref={screenHeading} tabIndex="-1">{choosingPaymentType ? 'Which payment issue applies?' : 'What’s going wrong?'}</h1>
        {choosingPaymentType ? (
          <>
            <button type="button" className="text-back" onClick={returnToTopLevelSituations}>← Choose a different situation</button>
            <div className="choice-list">
              {paymentIssues.map(item => (
                <button key={item.id} className={`choice ${flow.situation === item.id ? 'selected' : ''}`} onClick={() => setFlow({ ...flow, situation: item.id })}>
                  <span className="choice-icon" aria-hidden="true">₹</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b aria-hidden="true">›</b>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="choice-list">
            {situations.map(item => (
              <button key={item.id} className={`choice ${flow.category === item.id ? 'selected' : ''}`} onClick={() => chooseCategory(item.id)}>
                <span className="choice-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b aria-hidden="true">›</b>
              </button>
            ))}
          </div>
        )}
        <button className="button button--primary" disabled={!flow.situation} onClick={() => navigate('/minimal-details')}>Continue <span aria-hidden="true">→</span></button>
      </div>
    </section>
  )
}

function MinimalDetails() {
  const { flow, setFlow } = useContext(FlowContext)
  const navigate = useNavigate()
  const today = toLocalDateValue(new Date())
  const update = e => {
    if (e.target.name === 'date' && e.target.value > today) return
    setFlow({ ...flow, [e.target.name]: e.target.value })
  }
  return (
    <section className="screen flow-screen">
      <Header step={2} title="Only share what you’re comfortable with." />
      <form className="content" onSubmit={e => { e.preventDefault(); navigate('/diagnostic') }}>
        <p className="eyebrow">A FEW DETAILS</p>
        <h1>Help us narrow it down</h1>
        <p className="synthetic-note"><strong>Demo values only:</strong> Use made-up details, not a real application or receipt number.</p>
        <label htmlFor="reference">Application or receipt number <span>Optional</span></label>
        <input id="reference" name="reference" value={flow.reference} onChange={update} placeholder="e.g. TEST-1234" />
        <label htmlFor="state">State or UT</label>
        <select id="state" name="state" value={flow.state} onChange={update} required><option value="">Select your state</option><option>Delhi</option><option>Karnataka</option><option>Maharashtra</option><option>Rajasthan</option><option>Tamil Nadu</option><option>Uttar Pradesh</option><option>Other</option></select>
        <label htmlFor="application-date">When did you apply? <span>Optional</span></label>
        <input id="application-date" type="date" name="date" value={flow.date} max={today} onChange={update} />
        <div className="safe-note"><span aria-hidden="true">⌾</span><p><strong>Your privacy matters</strong><br />Nothing you enter is sent to a server. It stays in this browser tab and is removed when you start over or close the tab.</p></div>
        <button className="button button--primary" type="submit" disabled={!flow.state}>Check my situation <span aria-hidden="true">→</span></button>
      </form>
    </section>
  )
}

function Diagnostic() {
  const navigate = useNavigate()
  return (
    <section className="screen flow-screen diagnostic">
      <Header step={3} title="Building a practical path from your answers." />
      <div className="content centered">
        <div className="radar" aria-hidden="true"><span>✓</span></div>
        <p className="eyebrow">SITUATION CHECKED</p>
        <h1>We found a clear path forward</h1>
        <p>Based on the details you shared, here’s the safest order to try.</p>
        <div className="check-stack"><span>✓ Details reviewed</span><span>✓ Common causes compared</span><span>✓ Next actions prepared</span></div>
        <button className="button button--primary" onClick={() => navigate('/result')}>Show my action plan <span aria-hidden="true">→</span></button>
      </div>
    </section>
  )
}

function Result() {
  const { flow, resetFlow } = useContext(FlowContext)
  const selected = [...situations, ...paymentIssues].find(s => s.id === flow.situation)
  const showPaymentWarning = ['DEBITED_STATUS_PENDING', 'DUPLICATE_DEBIT'].includes(flow.situation)
  const recoverySteps = resultPlans[flow.situation] || []
  const downloadRecoveryNote = () => {
    const html = buildRecoveryNote(flow)
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `clearpath-recovery-note-${flow.situation || 'case'}.html`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section className="screen result-screen">
      <div className="result-head"><Brand compact /><span>YOUR CLEARPATH</span></div>
      <div className="content">
        <p className="eyebrow">RECOMMENDED NEXT STEPS</p>
        <h1>{selected?.title || 'Your action plan'}</h1>
        <p className="summary">Try these steps in order. Keep screenshots and reference numbers as you go.</p>
        <p className="sample-guidance"><strong>This is sample guidance based on common cases, not a live status check.</strong></p>
        {showPaymentWarning && (
          <div className="payment-warning" role="alert" aria-live="assertive">
            <span className="payment-warning__icon" aria-hidden="true">⚠</span>
            <div>
              <strong>DO NOT PAY AGAIN YET</strong>
              <p>Do not make another payment until this status is verified.</p>
            </div>
          </div>
        )}
        <ol className="action-list">
          {recoverySteps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
                {step.officialLink && <a className="official-link" href="https://parivahan.gov.in" target="_blank" rel="noopener noreferrer">Open the official Parivahan site ↗</a>}
              </div>
            </li>
          ))}
        </ol>
        <details className="rule-details"><summary>Why am I seeing this?</summary><p>{resultRules[flow.situation] || 'This path was selected from the information you provided.'}</p></details>
        <div className="caution"><strong>Before you proceed</strong><p>Never share OTPs or pay anyone claiming they can “unlock” your application. Verify every address independently.</p></div>
        <button className="button button--download" type="button" onClick={downloadRecoveryNote}><span aria-hidden="true">⇩</span> Download recovery note</button>
        <Link className="button button--secondary" to="/welcome" onClick={resetFlow}>Start over</Link>
      </div>
    </section>
  )
}

export default App
