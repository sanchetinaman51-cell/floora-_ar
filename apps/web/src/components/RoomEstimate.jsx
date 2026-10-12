import { useEffect, useMemo, useState } from 'react';
import { calculateRoomEstimate, formatINR } from '../lib/roomEstimate.js';
import { recordMaterialSelection } from '../lib/activity.js';

function RoomEstimate({ stones, loadState }) {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [wastagePercent, setWastagePercent] = useState('0');
  const [stoneId, setStoneId] = useState('');
  const [rate, setRate] = useState('');
  const selectedStone = stones.find((stone) => stone.id === stoneId);

  useEffect(() => {
    if (!stoneId && stones.length > 0) {
      setStoneId(stones[0].id);
      setRate(String(stones[0].price.min));
    }
  }, [stoneId, stones]);

  function selectStone(event) {
    const nextStoneId = event.target.value;
    const nextStone = stones.find((stone) => stone.id === nextStoneId);
    setStoneId(nextStoneId);
    setRate(nextStone ? String(nextStone.price.min) : '');
    if (nextStone) recordMaterialSelection(nextStone.id);
  }

  function updateRate(event) {
    const nextRate = event.target.value;
    setRate(nextRate);
  }

  const rateEstimate = useMemo(() => calculateRoomEstimate({
    length,
    width,
    rate,
    price: selectedStone?.price,
    wastagePercent,
  }), [length, width, rate, selectedStone, wastagePercent]);

  return (
    <section className="estimate-section" id="room-estimate" aria-labelledby="estimate-title">
      <div className="estimate-intro">
        <p className="eyebrow"><span className="eyebrow-line" /> A first look at your space</p>
        <h2 id="estimate-title">Room for <em>possibility.</em></h2>
        <p>Enter your room dimensions and choose a stone to explore an indicative material estimate.</p>
        <div className="estimate-disclosure" role="note">
          <span aria-hidden="true">i</span>
          <p>Sample pricing and calculations are estimates only. Taxes, installation, transport, other charges, and final slab selection are excluded.</p>
        </div>
      </div>

      <div className="estimate-workspace">
        <form className="estimate-controls" onSubmit={(event) => event.preventDefault()}>
          <p className="estimate-step">01 <span>Your room</span></p>
          <div className="dimension-fields">
            <label className="estimate-field">
              <span>Length</span>
              <span className="estimate-input-wrap">
                <input aria-label="Room length in feet" type="number" min="0" step="any" value={length} onChange={(event) => setLength(event.target.value)} placeholder="e.g. 12" />
                <span>ft</span>
              </span>
              {rateEstimate.errors.length && <small className="field-error">{rateEstimate.errors.length}</small>}
            </label>
            <span className="dimension-times" aria-hidden="true">×</span>
            <label className="estimate-field">
              <span>Width</span>
              <span className="estimate-input-wrap">
                <input aria-label="Room width in feet" type="number" min="0" step="any" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="e.g. 10" />
                <span>ft</span>
              </span>
              {rateEstimate.errors.width && <small className="field-error">{rateEstimate.errors.width}</small>}
            </label>
          </div>

          <p className="estimate-step">02 <span>Your stone</span></p>
          <label className="estimate-field estimate-field--wide">
            <span>Choose from the material library</span>
            <select aria-label="Stone for room estimate" value={stoneId} onChange={selectStone} disabled={loadState !== 'ready' || stones.length === 0}>
              {stones.length === 0 && <option value="">Catalog unavailable</option>}
              {stones.map((stone) => <option key={stone.id} value={stone.id}>{stone.name}</option>)}
            </select>
          </label>

          {selectedStone && (
            <div className="estimate-rate-panel">
              <div>
                <span className="estimate-rate-label">Price basis</span>
                <strong>{selectedStone.price.label}</strong>
                <small>{selectedStone.price.source === 'supplier' ? 'Supplier-provided sample rate' : 'Indicative online estimate'}</small>
              </div>
              <label className="estimate-field estimate-field--rate">
                <span>Use rate per sq. ft.</span>
                <span className="estimate-input-wrap estimate-input-wrap--rate">
                  <span>₹</span>
                  <input aria-label="Selected rate per square foot" type="number" min={selectedStone.price.min} max={selectedStone.price.max ?? undefined} step="any" value={rate} onChange={updateRate} />
                </span>
              </label>
              <p className="estimate-rate-help">
                {selectedStone.price.max === selectedStone.price.min
                  ? 'Fixed sample rate from the catalog.'
                  : selectedStone.price.max === null
                    ? `Choose at least ₹${selectedStone.price.min}; the catalog range has no confirmed upper limit.`
                    : `Choose any rate from ₹${selectedStone.price.min} to ₹${selectedStone.price.max}.`}
              </p>
            </div>
          )}

          <label className="estimate-field estimate-field--wide estimate-wastage">
            <span>Optional wastage allowance</span>
            <span className="estimate-input-wrap estimate-input-wrap--rate">
              <input aria-label="Wastage allowance percent" type="number" min="0" max="100" step="any" value={wastagePercent} onChange={(event) => setWastagePercent(event.target.value)} />
              <span>%</span>
            </span>
            <small>Applied to the planning area only; your supplier should confirm the amount needed.</small>
          </label>
        </form>

        <aside className="estimate-result" aria-live="polite" aria-label="Room estimate result">
          <p className="estimate-step">YOUR MATERIAL OUTLOOK</p>
          {selectedStone && <h3>{selectedStone.name}</h3>}
          <p className="result-price-basis">{selectedStone ? `${formatINR(Number(rate) || 0)} / sq. ft. · selected rate` : 'Choose a catalog stone'}</p>
          {rateEstimate.valid ? (
            <>
              <div className="result-area-row"><span>Room area</span><strong>{rateEstimate.area.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq. ft.</strong></div>
              {rateEstimate.wastagePercent > 0 && <div className="result-area-row"><span>With {rateEstimate.wastagePercent}% allowance</span><strong>{rateEstimate.billableArea.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq. ft.</strong></div>}
              <div className="result-total">
                <span>Estimated material cost</span>
                <strong>{formatINR(rateEstimate.materialCost)}</strong>
              </div>
              <p className="result-formula">{rateEstimate.billableArea.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq. ft. × {formatINR(rateEstimate.rate)} per sq. ft.</p>
            </>
          ) : (
            <div className="estimate-invalid" role="status">
              <span aria-hidden="true">↗</span>
              <p>Enter positive room dimensions to see your estimate.</p>
              {rateEstimate.errors.dimensions && <small>{rateEstimate.errors.dimensions}</small>}
              {rateEstimate.errors.rate && <small>{rateEstimate.errors.rate}</small>}
              {rateEstimate.errors.wastagePercent && <small>{rateEstimate.errors.wastagePercent}</small>}
            </div>
          )}
          <p className="result-disclaimer">A preliminary material-only estimate. Taxes, installation, transport, and other charges are not included. Confirm the final price and required quantity with your supplier.</p>
        </aside>
      </div>
    </section>
  );
}

export default RoomEstimate;
