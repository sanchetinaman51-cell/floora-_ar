function availabilityLabel(availability) {
  const labels = {
    available: 'Sample available',
    limited: 'Sample limited',
    unavailable: 'Sample unavailable',
  };

  return labels[availability] || 'Sample status';
}

function StoneCard({ stone, index, onOpenDetails, onOpenPreview }) {
  return (
    <article className="stone-card">
      <button
        className="stone-card__image-button"
        type="button"
        onClick={() => onOpenDetails(stone)}
        aria-label={`View details for ${stone.name}`}
      >
        <img
          className="stone-card__image"
          src={stone.image}
          alt={`${stone.name} — illustrative marble texture preview`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = '/images/stones/white-soft.svg';
          }}
        />
        <span className={`availability availability--${stone.availability}`}>
          <span className="availability__dot" aria-hidden="true" />
          {availabilityLabel(stone.availability)}
        </span>
        <span className="image-caption">Illustrative texture</span>
      </button>

      <div className="stone-card__body">
        <div className="stone-card__title-row">
          <div>
            <p className="stone-card__category">{stone.category}</p>
            <h3>{stone.name}</h3>
          </div>
          <span className="stone-index">{String(index).padStart(2, '0')}</span>
        </div>

        <div className="stone-card__price">
          <span className="price-label">{stone.price.label}</span>
          <span className={`price-source price-source--${stone.price.source}`}>
            {stone.price.disclosure}
          </span>
        </div>

        <div className="stone-card__actions">
          <button className="text-link" type="button" onClick={() => onOpenDetails(stone)}>
            Explore stone <span aria-hidden="true">↗</span>
          </button>
          <button
            className="stone-card__preview-link"
            type="button"
            onClick={() => onOpenPreview(stone)}
            aria-label={`Preview ${stone.name} in room`}
          >
            Preview in room <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default StoneCard;

