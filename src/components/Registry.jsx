import { emptyRegistry } from '../lib/store.js'

export default function Registry({ details, setDetails, onAskHeyGirl }) {
  const has = details.hasRegistry !== false
  const registries = details.registries || []

  const setHas = (val) => setDetails({ ...details, hasRegistry: val })
  const updateRegistry = (id, patch) =>
    setDetails({ ...details, registries: registries.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const addRegistry = () => setDetails({ ...details, registries: [...registries, emptyRegistry()] })
  const removeRegistry = (id) => setDetails({ ...details, registries: registries.filter((r) => r.id !== id) })

  return (
    <div className="panel">
      <p className="hint">Tell Hey Girl how to handle gift and registry questions from your guests.</p>

      <div className="reg-q">
        <div className="detail-label">Are you having a registry?</div>
        <div className="yn">
          <button type="button" className={`yn-btn ${has ? 'on' : ''}`} onClick={() => setHas(true)}>Yes</button>
          <button type="button" className={`yn-btn ${!has ? 'on' : ''}`} onClick={() => setHas(false)}>No</button>
        </div>
      </div>

      {!has ? (
        <div className="reg-section">
          <label className="gd-field full">
            <span>What should guests see when they ask about your registry?</span>
            <textarea
              rows="3"
              value={details.registryMessage || ''}
              onChange={(e) => setDetails({ ...details, registryMessage: e.target.value })}
              placeholder="e.g. Your presence is the only present we need! If you'd like to celebrate with a gift, a contribution to our honeymoon fund would be so appreciated."
            />
          </label>
          <div className="reg-suggest">
            <p>Not sure how to word it? Hey Girl Chat can help you write a warm, gracious note for guests asking about gifts.</p>
            <button type="button" className="add-member" onClick={() => onAskHeyGirl?.()}>💬 Ask Hey Girl Chat</button>
          </div>
        </div>
      ) : (
        <div className="reg-section">
          <div className="detail-label">Where are you registered?</div>
          {registries.length === 0 && <p className="hint">Add the stores or sites where guests can find your registry.</p>}
          {registries.map((r) => (
            <div key={r.id} className="reg-item">
              <input value={r.name} onChange={(e) => updateRegistry(r.id, { name: e.target.value })} placeholder="Store / site name" />
              <input value={r.url} onChange={(e) => updateRegistry(r.id, { url: e.target.value })} placeholder="https://…" />
              <button className="del small" onClick={() => removeRegistry(r.id)} title="Remove">×</button>
            </div>
          ))}
          <button type="button" className="add-member" onClick={addRegistry}>+ Add registry</button>

          <label className="ck" style={{ marginTop: '12px' }}>
            <input
              type="checkbox"
              checked={!!details.stickToRegistry}
              onChange={(e) => setDetails({ ...details, stickToRegistry: e.target.checked })}
            />
            We'd prefer guests choose gifts from our registry
          </label>
          <p className="hint">
            Guests only see this preference if you turn on “Allow guests to inquire if you prefer that guests stick
            to the registry items?” on the Shared Details tab.
          </p>
        </div>
      )}
    </div>
  )
}
