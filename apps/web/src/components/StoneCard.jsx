function availabilityLabel(availability) {
  const labels = {
    available: 'Sample available',
    limited: 'Sample limited',
    unavailable: 'Sample unavailable',
  };

  return labels[availability] || 'Sample status';
}

function StoneCard({ stone, index, onOpenDetails }) {
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
          alt={`Illustrative placeholder texture, not a verified photo of ${stone.name}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = '/images/stones/white-soft.svg';
          }}
        />
        <span className={`availability availability--${stone.availability}`}>
          <span className="availability__dot" aria-hidden="true" />
          {availabilityLabel(stone.availability)}
        </span>
        <span className="image-caption">Illustrative placeholder</span>
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

        <button className="text-link" type="button" onClick={() => onOpenDetails(stone)}>
          Explore stone <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>
  );
}

export default StoneCard;
