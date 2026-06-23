import { budgetStats } from '../lib/store.js'

const money = (n) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function Budget({ budget, setBudgetTotal, addBudgetItem, updateBudgetItem, removeBudgetItem }) {
  const s = budgetStats(budget)
  const over = s.remaining < 0
  const pct = s.total > 0 ? Math.min(100, Math.round((s.actual / s.total) * 100)) : 0

  return (
    <div className="panel">
      <div className="budget-head">
        <label className="budget-total">
          <span>Total budget</span>
          <input
            type="number"
            min="0"
            value={budget.total}
            onChange={(e) => setBudgetTotal(e.target.value)}
          />
        </label>
        <div className={`budget-remaining ${over ? 'over' : ''}`}>
          <div className="big">{money(Math.abs(s.remaining))}</div>
          <div className="small">{over ? 'over budget' : 'left to allocate'}</div>
        </div>
      </div>

      <div className="bar">
        <div className={`bar-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="bar-legend">
        <span>{money(s.actual)} spent of {money(s.total)}</span>
        <span>{pct}%</span>
      </div>

      <div className="stats budget-stats">
        <Mini label="Estimated" value={money(s.estimated)} />
        <Mini label="Actual" value={money(s.actual)} />
        <Mini label="Paid" value={money(s.paid)} tone="good" />
        <Mini label="Outstanding" value={money(s.outstanding)} tone="warn" />
      </div>

      <div className="budget-table">
        <div className="brow bhead">
          <span>Category</span>
          <span>Est.</span>
          <span>Actual</span>
          <span>Paid</span>
          <span>Owe</span>
          <span>Due</span>
          <span></span>
        </div>
        {budget.items.map((it) => {
          const actual = Number(it.actual) || 0
          const paidAmount = Number(it.paidAmount) || 0
          const owe = Math.max(0, actual - paidAmount)
          const settled = actual > 0 && owe === 0
          return (
            <div className="brow" key={it.id}>
              <div className="bcat">
                <input
                  value={it.category}
                  onChange={(e) => updateBudgetItem(it.id, { category: e.target.value })}
                />
                <input
                  className="bvendor"
                  placeholder="Vendor (optional)"
                  value={it.vendor}
                  onChange={(e) => updateBudgetItem(it.id, { vendor: e.target.value })}
                />
                <div className="bweb">
                  <input
                    className="bvendor"
                    placeholder="Vendor website (optional)"
                    value={it.website || ''}
                    onChange={(e) => updateBudgetItem(it.id, { website: e.target.value })}
                  />
                  {it.website ? (
                    <a className="bweb-link" href={it.website} target="_blank" rel="noreferrer" title="Open vendor site">↗</a>
                  ) : null}
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={it.estimated}
                onChange={(e) => updateBudgetItem(it.id, { estimated: Number(e.target.value) || 0 })}
              />
              <input
                type="number"
                min="0"
                value={it.actual}
                onChange={(e) => updateBudgetItem(it.id, { actual: Number(e.target.value) || 0 })}
              />
              <input
                type="number"
                min="0"
                className="bpaid"
                value={it.paidAmount}
                onChange={(e) => updateBudgetItem(it.id, { paidAmount: Number(e.target.value) || 0 })}
                title="How much you've paid so far"
              />
              <span className={`owe ${settled ? 'settled' : ''}`} title="Still owed">
                {settled ? '✓' : money(owe)}
              </span>
              <input
                type="date"
                className="bdue"
                value={it.dueDate || ''}
                onChange={(e) => updateBudgetItem(it.id, { dueDate: e.target.value })}
                title="Payment due date"
              />
              <button className="del small" onClick={() => removeBudgetItem(it.id)} title="Remove">×</button>
            </div>
          )
        })}
      </div>

      <button className="add-row" onClick={() => addBudgetItem()}>+ Add line item</button>
    </div>
  )
}

function Mini({ label, value, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-value sm">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
