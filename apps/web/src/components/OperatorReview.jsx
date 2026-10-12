import { useState } from 'react';

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString();
}

function OperatorReview() {
  const [token, setToken] = useState('');
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState([]);
  const [activityStatus, setActivityStatus] = useState('idle');
  const [activityMessage, setActivityMessage] = useState('');

  async function loadRequests(event) {
    event.preventDefault();
    if (status === 'loading') return;
    if (!token.trim()) {
      setStatus('error');
      setMessage('Enter the development-only operator token configured in your local .env file.');
      setRequests([]);
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/operator/quotes', {
        headers: { 'x-operator-token': token.trim() },
      });
      let result;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        setRequests([]);
        setMessage(response.status === 401 || response.status === 403
          ? 'Access denied. Check the local operator token and confirm the API request is from this development machine.'
          : response.status === 503
            ? 'Local review access is not configured. Set OPERATOR_REVIEW_TOKEN in .env and restart the API.'
            : result?.error || 'The quotation requests could not be loaded. Try again.');
        setStatus('error');
        return;
      }

      if (!Array.isArray(result)) throw new Error('The operator response was invalid.');
      setRequests(result);
      setStatus('ready');
    } catch {
      setRequests([]);
      setMessage('The Floora API could not be reached. Check that it is running and try again.');
      setStatus('error');
    }
  }

  async function loadActivity() {
    if (activityStatus === 'loading') return;
    setActivityStatus('loading');
    setActivityMessage('');
    try {
      const response = await fetch('/api/operator/activity', {
        headers: { 'x-operator-token': token.trim() },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(response.status === 401 || response.status === 403
          ? 'Access denied. Check the local operator token and confirm the API request is from this development machine.'
          : response.status === 503
            ? 'Local review access is not configured. Set OPERATOR_REVIEW_TOKEN in .env and restart the API.'
            : result?.error || 'The activity log could not be loaded. Try again.');
      }
      if (!Array.isArray(result)) throw new Error('The activity response was invalid.');
      setActivity(result);
      setActivityStatus('ready');
    } catch (error) {
      setActivity([]);
      setActivityMessage(error.message || 'The activity log could not be loaded. Check that the API is running.');
      setActivityStatus('error');
    }
  }

  return (
    <section className="operator-section" id="operator-review" aria-labelledby="operator-title">
      <div className="operator-section__intro">
        <p className="eyebrow"><span className="eyebrow-line" /> Local project workspace</p>
        <h2 id="operator-title">Operator <em>review.</em></h2>
        <p>A private, development-only view of quotation requests for the person running this local project.</p>
        <div className="operator-security-note" role="note">
          <span aria-hidden="true">⌑</span>
          <p>Access is checked by the API: requests must come from loopback and include your local development token. This surface is disabled in production.</p>
        </div>
      </div>

      <div className="operator-workspace">
        <form className="operator-access-form" onSubmit={loadRequests}>
          <p className="estimate-step">LOCAL ACCESS</p>
          <label className="quote-field" htmlFor="operator-token">
            <span>Development operator token</span>
            <input
              id="operator-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                if (status === 'error') {
                  setStatus('idle');
                  setMessage('');
                }
              }}
              aria-describedby="operator-token-help"
            />
          </label>
          <small id="operator-token-help">Token stays in this page's memory and is sent only to the local API.</small>
          <button className="button button--dark" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking access…' : status === 'ready' ? 'Refresh requests' : 'Review requests'}
            {status !== 'loading' && <span aria-hidden="true">↗</span>}
          </button>
          {status === 'error' && <p className="operator-message operator-message--error" role="alert">{message}</p>}
          {status === 'loading' && <p className="operator-message" role="status">Checking local access and loading requests…</p>}
        </form>

        <div className="operator-results" aria-live="polite">
          <div className="operator-results__heading">
            <p className="estimate-step">REQUESTS</p>
            {status === 'ready' && <span>{requests.length} total</span>}
          </div>
          {status === 'idle' && <p className="operator-empty">Enter your local token to view quotation requests.</p>}
          {status === 'error' && <p className="operator-empty">Requests are hidden until local access succeeds.</p>}
          {status === 'ready' && requests.length === 0 && (
            <div className="operator-empty operator-empty--ready">
              <span aria-hidden="true">⌁</span>
              <strong>No quotation requests yet</strong>
              <p>Accepted customer requests will appear here while this API process is running.</p>
            </div>
          )}
          {status === 'ready' && requests.length > 0 && (
            <div className="operator-request-list">
              {requests.map((request) => (
                <article className="operator-request" key={request.id}>
                  <div className="operator-request__topline">
                    <span>Request {request.id}</span>
                    <time dateTime={request.createdAt}>{displayDate(request.createdAt)}</time>
                  </div>
                  <h3>{request.customerName}</h3>
                  <dl>
                    <div><dt>Stone</dt><dd>{request.stone?.name || 'Unknown stone'}</dd></div>
                    <div><dt>Project location</dt><dd>{request.projectLocation}</dd></div>
                    <div>
                      <dt>Room dimensions</dt>
                      <dd>{request.roomDimensions
                        ? `${request.roomDimensions.lengthFeet} × ${request.roomDimensions.widthFeet} ft`
                        : 'Not supplied'}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
          {status === 'ready' && <p className="operator-contact-note">Email addresses and phone numbers are intentionally omitted from this review response.</p>}
          {status === 'ready' && (
            <section className="operator-activity" aria-labelledby="operator-activity-title">
              <div className="operator-activity__heading">
                <div>
                  <p className="estimate-step">RECENT EVENTS</p>
                  <h3 id="operator-activity-title">Activity <em>log.</em></h3>
                </div>
                <button className="operator-activity__refresh" type="button" onClick={loadActivity} disabled={activityStatus === 'loading'}>
                  {activityStatus === 'loading' ? 'Loading…' : activityStatus === 'ready' ? 'Refresh activity' : 'Load activity'}
                </button>
              </div>
              {activityStatus === 'idle' && <p className="operator-empty">Load the recent activity recorded by this API process.</p>}
              {activityStatus === 'loading' && <p className="operator-message" role="status">Loading recent activity…</p>}
              {activityStatus === 'error' && <p className="operator-message operator-message--error" role="alert">{activityMessage}</p>}
              {activityStatus === 'ready' && activity.length === 0 && <p className="operator-empty">No recent activity yet.</p>}
              {activityStatus === 'ready' && activity.length > 0 && (
                <ol className="operator-activity__list">
                  {activity.map((entry, index) => (
                    <li key={`${entry.type}-${entry.requestId || entry.stone?.id}-${entry.timestamp}-${index}`}>
                      <span className="operator-activity__marker" aria-hidden="true">{entry.type === 'quotation-submitted' ? '↗' : '⌁'}</span>
                      <div>
                        <strong>{entry.type === 'quotation-submitted' ? 'Quotation request received' : 'Material selected'}</strong>
                        <p>{entry.stone?.name || 'Catalog stone'}{entry.requestId ? ` · Request ${entry.requestId}` : ''}</p>
                      </div>
                      <time dateTime={entry.timestamp}>{displayDate(entry.timestamp)}</time>
                    </li>
                  ))}
                </ol>
              )}
              <p className="operator-contact-note">Activity contains stone and request references only—never customer contact details or notes. Times use server-generated ISO 8601 timestamps.</p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

export default OperatorReview;
