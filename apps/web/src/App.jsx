import { useCallback, useEffect, useMemo, useState } from 'react';
import StoneCard from './components/StoneCard.jsx';
import StoneDetailsDialog from './components/StoneDetailsDialog.jsx';
import RoomEstimate from './components/RoomEstimate.jsx';
import QuoteRequestForm from './components/QuoteRequestForm.jsx';
import OperatorReview from './components/OperatorReview.jsx';
import ARPreview from './components/ARPreview.jsx';
import { filterStones } from './lib/stoneFilters.js';

const categories = ['All stones', 'Indian Marble', 'Imported Marble'];

function BrandMark() {
  return (
    <a className="brand" href="#top" aria-label="Floora AR home">
      <img
        className="brand__image"
        src="/floora-ar-logo.png"
        alt=""
        aria-hidden="true"
      />
      <span className="brand__wordmark">
        <strong>FLOORA</strong>
        <small>AR · STONE STUDIO</small>
      </span>
    </a>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function App() {
  const [stones, setStones] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [selectedStone, setSelectedStone] = useState(null);
  const [previewStone, setPreviewStone] = useState(null);

  useEffect(() => {
    let active = true;

    fetch('/api/stones')
      .then((response) => {
        if (!response.ok) throw new Error('Catalog request failed');
        return response.json();
      })
      .then((catalog) => {
        if (!Array.isArray(catalog)) throw new Error('Catalog response was invalid');
        if (active) {
          setStones(catalog);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (active) setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleStones = useMemo(
    () => filterStones(stones, { query, category }),
    [stones, query, category],
  );

  const closeDetails = useCallback(() => setSelectedStone(null), []);

  return (
    <div className="site-shell" id="top">
      <a className="skip-link" href="#collection">Skip to stone collection</a>

      <header className="site-header">
        <div className="site-header__inner">
          <BrandMark />
          <nav className="main-nav" aria-label="Main navigation">
            <a className="main-nav__active" href="#collection">The collection</a>
            <a href="#room-estimate">Room estimate</a>
            <a href="#operator-review">Local operator</a>
            <a href="#studio-flow">The Floora approach</a>
          </nav>
            <a className="header-cta" href="#quote-request">
            Begin your journey <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> A more considered way to choose stone</p>
            <h1 id="hero-title" aria-label="Scan your space. Discover your stone.">
              Scan your space.<br /><em>Discover your stone.</em>
            </h1>
            <p className="hero-description">
              Find the surface that feels like it belongs. Explore a considered collection
              of natural stone, with details that help you take the next step.
            </p>
            <a className="button button--dark" href="#collection">
              Explore the collection <span aria-hidden="true">↓</span>
            </a>
            <div className="hero-footnote">
              <span className="hero-footnote__rule" />
              <span>Natural character. Made for the spaces we live in.</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Illustrative marble interior composition">
            <img
              src="/images/stones/hero-surface.svg"
              alt="Illustrative marble and architectural forms; not a photograph of a specific stone slab"
            />
            <div className="hero-art__label">
              <span className="hero-art__index">01 / 03</span>
              <span>Surface studies</span>
            </div>
            <div className="hero-stamp" aria-hidden="true">
              <span>F</span>
              <small>FLOORA<br />MATERIAL INDEX</small>
            </div>
            <div className="hero-art__vertical">A study in natural surfaces</div>
          </div>
          <div className="hero-bottomline">
            <span>Designed around the way you live</span>
            <span className="hero-bottomline__center">01 — 10 <i /> MATERIALS TO EXPLORE</span>
            <a href="#collection">Scroll to discover <span aria-hidden="true">↓</span></a>
          </div>
        </section>

        <section className="collection-section" id="collection" aria-labelledby="collection-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> The material library</p>
              <h2 id="collection-title">A surface with <em>a story.</em></h2>
            </div>
            <p className="section-intro">
              From quiet whites to dramatic veining, each stone brings its own rhythm.
              Find a starting point for the space you imagine.
            </p>
          </div>

          <div className="catalog-toolbar">
            <div className="category-filters" aria-label="Filter stones by category">
              {categories.map((item) => (
                <button
                  className={`filter-chip${category === item ? ' filter-chip--active' : ''}`}
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  {item === categories[0] && <span className="filter-count">{stones.length}</span>}
                </button>
              ))}
            </div>
            <label className="search-field">
              <SearchIcon />
              <span className="visually-hidden">Search stones by name</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the collection"
              />
            </label>
          </div>

          <div className="catalog-disclaimer" role="note">
            <span className="catalog-disclaimer__icon" aria-hidden="true">i</span>
            <p>
              <strong>Demo collection.</strong> Except where marked supplier-provided, prices are
              indicative online estimates, not verified quotations for exact slabs. Stock labels
              and imagery are illustrative placeholders; confirm details with your supplier.
            </p>
          </div>

          {loadState === 'loading' && (
            <p className="catalog-message" role="status">Preparing the material library…</p>
          )}
          {loadState === 'error' && (
            <p className="catalog-message catalog-message--error" role="alert">
              The collection could not load. Please check that the Floora API is running and try again.
            </p>
          )}
          {loadState === 'ready' && visibleStones.length === 0 && (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No stones found</h3>
              <p>Try another name or choose a different material category.</p>
              <button type="button" className="text-link" onClick={() => { setQuery(''); setCategory(categories[0]); }}>
                Clear filters <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
          {loadState === 'ready' && visibleStones.length > 0 && (
            <div className="stone-grid" aria-live="polite">
              {visibleStones.map((stone, index) => (
                <StoneCard
                  key={stone.id}
                  stone={stone}
                  index={index + 1}
                  onOpenDetails={setSelectedStone}
                  onOpenPreview={setPreviewStone}
                />
              ))}
            </div>
          )}
          {loadState === 'ready' && (
            <div className="collection-endnote">
              <span>{visibleStones.length.toString().padStart(2, '0')} materials</span>
              <span>Each slab is one of a kind <i /> Explore with intention</span>
            </div>
          )}
        </section>

        <RoomEstimate stones={stones} loadState={loadState} />
        <QuoteRequestForm stones={stones} loadState={loadState} />
        <OperatorReview />

        <section className="studio-flow" id="studio-flow" aria-labelledby="studio-title">
          <div className="studio-flow__heading">
            <p className="eyebrow"><span className="eyebrow-line" /> Your space, your story</p>
            <h2 id="studio-title">A thoughtful choice<br /><em>starts here.</em></h2>
            <p>Start with a material estimate, then continue exploring the materials and tools taking shape at Floora.</p>
          </div>
          <div className="next-steps">
            <article className="next-step">
              <span className="next-step__number">01</span>
              <div className="next-step__icon" aria-hidden="true">↗</div>
              <h3>Room estimate</h3>
              <p>Explore a preliminary material estimate using your room dimensions.</p>
              <a className="text-link" href="#room-estimate">Open estimator <span aria-hidden="true">↗</span></a>
            </article>
            <article className="next-step">
              <span className="next-step__number">02</span>
              <div className="next-step__icon" aria-hidden="true">✳</div>
              <h3>Personal quotation</h3>
              <p>Bring your chosen material to a supplier conversation.</p>
              <a className="text-link" href="#quote-request">Start a request <span aria-hidden="true">↗</span></a>
            </article>
            <article className="next-step next-step--activity">
              <span className="next-step__number">03</span>
              <div className="next-step__icon" aria-hidden="true">⌁</div>
              <h3>Recently explored</h3>
              <p>Recent material selections and quotation submissions are visible in the local operator workspace.</p>
              <a className="text-link" href="#operator-review">Review activity locally <span aria-hidden="true">↗</span></a>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <BrandMark />
        <p>Natural stone, considered for the way you live.</p>
        <span>Floora AR · Material discovery</span>
        <a className="footer-operator-link" href="#operator-review">Local operator review</a>
      </footer>

      <StoneDetailsDialog stone={selectedStone} onClose={closeDetails} />
      {previewStone && (
        <ARPreview
          stones={stones}
          initialStone={previewStone}
          onClose={() => setPreviewStone(null)}
        />
      )}
    </div>
  );
}

export default App;
