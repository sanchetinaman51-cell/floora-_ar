
import { useEffect, useMemo, useState } from 'react';

const fallbackImage = '/images/stones/white-soft.svg';

function ARPreview({ stones = [], initialStone = null, onClose }) {
  const availableStones = useMemo(
    () => stones.filter((stone) => stone && stone.id && stone.name),
    [stones],
  );

  const [selectedId, setSelectedId] = useState(
    initialStone?.id ?? availableStones[0]?.id ?? '',
  );

  const selectedStone =
    availableStones.find((stone) => stone.id === selectedId) ??
    initialStone ??
    availableStones[0];

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedStone) return null;

  return (
    <div
      className="dialog-backdrop ar-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="ar-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ar-preview-title"
      >
        <div className="ar-preview__header">
          <div>
            <p className="eyebrow">FLOORA · MATERIAL STUDIO</p>
            <h2 id="ar-preview-title">Picture it in <em>your space.</em></h2>
            <p>Compare illustrative stone surfaces in a calm, 3D-style room setting.</p>
          </div>
          {onClose && (
            <button
              className="dialog-close ar-preview__close"
              type="button"
              onClick={onClose}
              aria-label="Close room preview"
            >
              Close preview
            </button>
          )}
        </div>

        <div className="ar-preview__room">
        <div className="ar-preview__wall">
          <div className="ar-preview__window">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="ar-preview__artwork">F</div>
        </div>

        <div
          className="ar-preview__floor"
          role="img"
          aria-label={`Illustrative floor preview using ${selectedStone.name}`}
        >
          <img
            className="ar-preview__texture"
            src={selectedStone.image || fallbackImage}
            alt=""
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackImage)) {
                event.currentTarget.hidden = true;
              } else {
                event.currentTarget.src = fallbackImage;
              }
            }}
          />
          <div className="ar-preview__floor-grid" />
          <div className="ar-preview__rug">
            <div className="ar-preview__table" />
          </div>
        </div>

        <div className="ar-preview__caption">
          <span>ILLUSTRATIVE 3D-STYLE PREVIEW</span>
          <strong>{selectedStone.name}</strong>
        </div>
        </div>

        <div className="ar-preview__controls">
        <div>
          <h3>Change your surface</h3>
          <p>Select a stone to update the room preview.</p>
        </div>
        <div className="ar-preview__stone-list">
          {availableStones.map((stone) => (
            <button
              key={stone.id}
              type="button"
              className={`ar-preview__stone${stone.id === selectedStone.id ? ' is-active' : ''}`}
              onClick={() => setSelectedId(stone.id)}
              aria-pressed={stone.id === selectedStone.id}
            >
              <img
                src={stone.image || fallbackImage}
                alt=""
                onError={(event) => {
                  if (event.currentTarget.src.endsWith(fallbackImage)) {
                    event.currentTarget.hidden = true;
                  } else {
                    event.currentTarget.src = fallbackImage;
                  }
                }}
              />
              <span>{stone.name}</span>
            </button>
          ))}
        </div>
        </div>

        <p className="ar-preview__disclaimer">
          Demo visualization only. This is not a live camera AR scan or an exact
          representation of installed stone. Confirm actual appearance with a physical sample.
        </p>
      </section>
    </div>
  );
}

export default ARPreview;
