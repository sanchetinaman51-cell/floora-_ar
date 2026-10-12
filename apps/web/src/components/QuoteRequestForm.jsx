import { useEffect, useState } from 'react';
import { createQuotePayload, validateQuoteForm } from '../lib/quoteForm.js';
import { recordMaterialSelection } from '../lib/activity.js';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  projectLocation: '',
  notes: '',
  stoneId: '',
  roomLengthFeet: '',
  roomWidthFeet: '',
};

function QuoteRequestForm({ stones, loadState }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!form.stoneId && stones.length > 0) {
      const firstAvailable = stones.find((stone) => stone.availability === 'available');
      if (firstAvailable) setForm((current) => ({ ...current, stoneId: firstAvailable.id }));
    }
  }, [form.stoneId, stones]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'stoneId' && value) recordMaterialSelection(value);
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === 'roomLengthFeet' || name === 'roomWidthFeet') delete next.roomDimensions;
      return next;
    });
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;

    const validation = validateQuoteForm(form, stones);
    setErrors(validation.errors);
    setMessage('');
    if (!validation.valid) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createQuotePayload(form, validation.stone)),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        const responseFields = { ...(result.fields ?? {}) };
        if (responseFields.roomLengthFeet || responseFields.roomWidthFeet) {
          responseFields.roomDimensions = responseFields.roomLengthFeet || responseFields.roomWidthFeet;
        }
        setErrors(responseFields);
        setMessage(result.error || 'We could not submit your request. Please review the form and try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setMessage(result.message || 'Your quotation request has been received.');
    } catch {
      setStatus('error');
      setMessage('We could not reach the Floora API. Your request was not submitted; please try again.');
    }
  }

  function startAnotherRequest() {
    const firstAvailable = stones.find((stone) => stone.availability === 'available');
    setForm({ ...emptyForm, stoneId: firstAvailable?.id ?? '' });
    setErrors({});
    setMessage('');
    setStatus('idle');
  }

  function fieldError(name) {
    return errors[name] ? <small className="quote-field-error" id={`quote-${name}-error`}>{errors[name]}</small> : null;
  }

  return (
    <section className="quote-section" id="quote-request" aria-labelledby="quote-title">
      <div className="quote-section__intro">
        <p className="eyebrow"><span className="eyebrow-line" /> A conversation about your project</p>
        <h2 id="quote-title">Let’s find the <em>right stone.</em></h2>
        <p>Share a few details and the Floora team can follow up about your selected material.</p>
        <div className="quote-privacy-note" role="note">
          <span aria-hidden="true">i</span>
          <p>Requests are stored in this local project instance for student-project review. They are not durable and will be lost when the API restarts.</p>
        </div>
      </div>

      <div className="quote-form-panel">
        {status === 'success' ? (
          <div className="quote-success" role="status">
            <span className="quote-success__mark" aria-hidden="true">✓</span>
            <p className="eyebrow">Request received</p>
            <h3>Thank you for sharing your project.</h3>
            <p>{message}</p>
            <button className="button button--dark" type="button" onClick={startAnotherRequest}>Send another request</button>
          </div>
        ) : (
          <form className="quote-form" onSubmit={submitRequest} noValidate>
            <p className="quote-required-note"><span>*</span> Required fields</p>
            {message && <p className="quote-form-message" role="alert">{message}</p>}

            <div className="quote-form-grid">
              <label className="quote-field">
                <span>Your name <b>*</b></span>
                <input name="name" type="text" autoComplete="name" maxLength="100" value={form.name} onChange={updateField} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'quote-name-error' : undefined} />
                {fieldError('name')}
              </label>
              <label className="quote-field">
                <span>Email address <b>*</b></span>
                <input name="email" type="email" autoComplete="email" maxLength="254" value={form.email} onChange={updateField} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'quote-email-error' : undefined} />
                {fieldError('email')}
              </label>
              <label className="quote-field">
                <span>Phone number <b>*</b></span>
                <input name="phone" type="tel" autoComplete="tel" maxLength="30" value={form.phone} onChange={updateField} aria-required="true" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'quote-phone-error' : undefined} />
                {fieldError('phone')}
              </label>
              <label className="quote-field">
                <span>Project location <b>*</b></span>
                <input name="projectLocation" type="text" autoComplete="address-level2" maxLength="200" placeholder="City, area or project site" value={form.projectLocation} onChange={updateField} aria-required="true" aria-invalid={Boolean(errors.projectLocation)} aria-describedby={errors.projectLocation ? 'quote-projectLocation-error' : undefined} />
                {fieldError('projectLocation')}
              </label>
              <label className="quote-field quote-field--wide">
                <span>Selected stone <b>*</b></span>
                <select name="stoneId" value={form.stoneId} onChange={updateField} disabled={loadState !== 'ready'} aria-required="true" aria-invalid={Boolean(errors.stoneId)} aria-describedby={errors.stoneId ? 'quote-stoneId-error' : undefined}>
                  <option value="">Choose a stone</option>
                  {stones.map((stone) => (
                    <option key={stone.id} value={stone.id} disabled={stone.availability !== 'available'}>
                      {stone.name}{stone.availability !== 'available' ? ' — not currently available' : ''}
                    </option>
                  ))}
                </select>
                {fieldError('stoneId')}
              </label>

              <div className="quote-dimensions quote-field--wide">
                <div className="quote-dimensions__heading">
                  <span>Room dimensions <small>Optional</small></span>
                  <p>If you have them, share both measurements in feet.</p>
                </div>
                <div className="quote-dimensions__inputs">
                  <label className="quote-field">
                    <span>Length (ft)</span>
                    <input name="roomLengthFeet" type="number" min="0" step="any" value={form.roomLengthFeet} onChange={updateField} aria-invalid={Boolean(errors.roomDimensions)} aria-describedby={errors.roomDimensions ? 'quote-roomDimensions-error' : undefined} />
                  </label>
                  <span aria-hidden="true">×</span>
                  <label className="quote-field">
                    <span>Width (ft)</span>
                    <input name="roomWidthFeet" type="number" min="0" step="any" value={form.roomWidthFeet} onChange={updateField} aria-invalid={Boolean(errors.roomDimensions)} aria-describedby={errors.roomDimensions ? 'quote-roomDimensions-error' : undefined} />
                  </label>
                </div>
                {errors.roomDimensions && <small className="quote-field-error" id="quote-roomDimensions-error">{errors.roomDimensions}</small>}
              </div>

              <label className="quote-field quote-field--wide">
                <span>Notes <small>Optional</small></span>
                <textarea name="notes" rows="3" maxLength="1000" placeholder="Tell us about the room, finish or timeline you have in mind." value={form.notes} onChange={updateField} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'quote-notes-error' : undefined} />
                {fieldError('notes')}
              </label>
            </div>

            <div className="quote-submit-row">
              <p>Your contact details are sent only to the local Floora API in this project setup.</p>
              <button className="button button--dark" type="submit" disabled={status === 'loading' || loadState !== 'ready'}>
                {status === 'loading' ? 'Sending request…' : 'Request a quotation'}
                {status !== 'loading' && <span aria-hidden="true">↗</span>}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default QuoteRequestForm;
