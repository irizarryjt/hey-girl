import { useState } from 'react'

// Edits auto-save as you type; this button is an explicit "your changes are saved"
// confirmation for reassurance. `compact` renders a small icon-only variant.
export default function SaveButton({ compact = false }) {
  const [saved, setSaved] = useState(false)
  const click = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }
  if (compact) {
    return (
      <button type="button" className={`save-icon ${saved ? 'saved' : ''}`} onClick={click} title="Save">
        {saved ? '✓' : '💾'}
      </button>
    )
  }
  return (
    <button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={click}>
      {saved ? '✓ Saved' : 'Save'}
    </button>
  )
}
