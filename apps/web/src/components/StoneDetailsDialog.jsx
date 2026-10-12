import { useEffect } from 'react';

function StoneDetailsDialog({ stone, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!stone) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="stone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stone-dialog-title"
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close stone details">
          ×
        </button>
        <div className="stone-dialog__image-wrap">
          <img
            src={stone.image}
            alt={`Illustrative placeholder texture, not a verified photo of ${stone.name}`}
            onError={(event) => {
              event.currentTarget.src = '/images/stones/white-soft.svg';
            }}
          />
          <span className="image-caption">Illustrative placeholder · not a confirmed slab photo</span>
        </div>
        <div className="stone-dialog__content">
          <p className="eyebrow">{stone.category} · Floora material index</p>
          <h2 id="stone-dialog-title">{stone.name}</h2>
          <p className="dialog-description">
            A starting point for comparing natural-stone surfaces. Confirm the exact slab,
            finish, availability and final quotation with your supplier.
          </p>
          <div className="dialog-price-block">
            <span className="price-label">{stone.price.label}</span>
            <span className={`price-source price-source--${stone.price.source}`}>
              {stone.price.disclosure}
            </span>
          </div>
          <p className="dialog-note">
            {stone.price.source === 'estimate'
              ? 'Indicative online estimate only; not a verified quotation for this exact slab.'
              : 'Shared as a supplier-provided price; confirm the exact slab and final quotation.'}
          </p>
          <p className="dialog-note">Availability shown in this demo is sample data only.</p>
        </div>
      </section>
    </div>
  );
}

export default StoneDetailsDialog;
