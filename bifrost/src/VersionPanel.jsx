import React from 'react';

function formatTime(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

/**
 * VersionPanel — Monica / PopAi inspired slide-over panel
 * Props:
 *   open            boolean
 *   versions        Array<{ id, timestamp, prompt, code, mode }>
 *   currentVersionId  number | null
 *   onClose         () => void
 *   onRestore       (version) => void
 */
function VersionPanel({ open, versions, currentVersionId, onClose, onRestore }) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)',
            animation: 'overlay-in 0.15s ease both',
          }}
          onClick={onClose}
        />
      )}

      <aside className={`version-panel${open ? ' open' : ''}`}>
        {/* Header */}
        <div className="version-panel-header">
          <div className="version-panel-title">
            <h2>History</h2>
            {versions.length > 0 && (
              <span className="version-count-badge">{versions.length}</span>
            )}
          </div>
          <button className="version-panel-close" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>

        {/* List */}
        <div className="version-list">
          {versions.length === 0 ? (
            <div className="version-empty">
              <div className="version-empty-icon">📋</div>
              <div className="version-empty-text">No versions yet</div>
              <div className="version-empty-hint">Generate something to create the first version.</div>
            </div>
          ) : (
            [...versions].reverse().map((version, revIdx) => {
              const realIdx = versions.length - 1 - revIdx; // display newest first
              const isActive = version.id === currentVersionId;
              return (
                <div
                  key={version.id}
                  className={`version-item${isActive ? ' active' : ''}`}
                  onClick={() => onRestore(version)}
                >
                  <div className="version-item-top">
                    <div className="version-item-label">
                      <span className="version-num">v{realIdx + 1}</span>
                      <span className={`version-mode-badge ${version.mode || 'web'}`}>
                        {version.mode === 'pipeline' ? '⬡ Pipeline' : '⬡ Web'}
                      </span>
                    </div>
                    <span className="version-time">{formatTime(version.timestamp)}</span>
                  </div>

                  <div className="version-prompt">
                    {version.prompt || '(no prompt)'}
                  </div>

                  <button
                    className="version-restore-btn"
                    onClick={(e) => { e.stopPropagation(); onRestore(version); }}
                  >
                    {isActive ? '✓ Current' : '↩ Restore'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}

export default VersionPanel;
