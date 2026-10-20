// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import stoneCatalog from '../../api/src/data/stoneCatalog.js';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => stoneCatalog,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('stone discovery dashboard', () => {
  it('shows the tagline and all ten materials with clearly qualified prices', async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { name: 'Scan your space. Discover your stone.' })).not.toBeNull();
    expect(container.querySelectorAll('.stone-card')).toHaveLength(10);
    expect(screen.getByText('₹60 / sq. ft.')).not.toBeNull();
    expect(screen.getByText('Supplier-provided price')).not.toBeNull();
    expect(screen.getAllByText('Estimated online range')).toHaveLength(9);
    expect(screen.getByText('Sample unavailable')).not.toBeNull();
    expect(screen.getByText(/not verified quotations for exact slabs/i)).not.toBeNull();
  });

  it('searches by stone name and presents a helpful empty state', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });

    const search = screen.getByRole('searchbox', { name: 'Search stones by name' });
    await user.type(search, 'banswara');

    expect(screen.getByRole('heading', { name: 'Banswara White' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Carrara White' })).toBeNull();

    await user.clear(search);
    await user.type(search, 'not a stone');
    expect(screen.getByRole('heading', { name: 'No stones found' })).not.toBeNull();
  });

  it('filters the collection by category', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });

    await user.click(screen.getByRole('button', { name: 'Imported Marble' }));

    expect(screen.getByRole('heading', { name: 'Carrara White' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Calacatta Gold' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Makrana White' })).toBeNull();
  });

  it('combines a category filter with the active search query', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });

    await user.click(screen.getByRole('button', { name: 'Imported Marble' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search stones by name' }), 'calacatta');

    expect(screen.getByRole('heading', { name: 'Calacatta Gold' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Carrara White' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Indian Statuario' })).toBeNull();
  });

  it('opens and closes the stone details view with image and price disclosures', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Calacatta Gold' });

    await user.click(screen.getByRole('button', { name: 'View details for Calacatta Gold' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.getByText(/Indicative online estimate only/i)).not.toBeNull();
    expect(screen.getByText(/not a confirmed slab photo/i)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Close stone details' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the illustrative room preview from a stone card, switches stones, and closes back to the catalog', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });

    await user.click(screen.getByRole('button', { name: 'Preview Morchana White in room' }));

    const preview = screen.getByRole('dialog', { name: /Picture it in your space/i });
    expect(preview).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Illustrative floor preview using Morchana White' })).not.toBeNull();
    expect(screen.getByText(/not a live camera AR scan/i)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Rajnagar White' }));
    expect(screen.getByRole('img', { name: 'Illustrative floor preview using Rajnagar White' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Close room preview' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByRole('heading', { name: 'Morchana White' }).length).toBeGreaterThan(0);
  });

  it('keeps stones without image URLs selectable and uses a local placeholder texture', async () => {
    const user = userEvent.setup();
    const catalogWithoutImage = stoneCatalog.map((stone) => ({ ...stone }));
    delete catalogWithoutImage[0].image;
    fetch.mockResolvedValueOnce({ ok: true, json: async () => catalogWithoutImage });
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });

    await user.click(screen.getByRole('button', { name: 'Preview Morchana White in room' }));

    expect(screen.getByRole('img', { name: 'Illustrative floor preview using Morchana White' }).querySelector('img').getAttribute('src'))
      .toBe('/images/stones/white-soft.svg');
    expect(screen.getByRole('button', { name: 'Morchana White' })).not.toBeNull();
  });

  it('estimates room material cost from catalog stones and selected range rates', async () => {
    const user = userEvent.setup();
    render(<App />);
    const result = screen.getByLabelText('Room estimate result');
    const length = screen.getByRole('spinbutton', { name: 'Room length in feet' });
    const width = screen.getByRole('spinbutton', { name: 'Room width in feet' });

    expect(await screen.findByText(/Enter positive room dimensions/)).not.toBeNull();
    await user.type(length, '12');
    await user.type(width, '10');

    expect(result.textContent).toContain('120 sq. ft.');
    expect(result.textContent).toContain('₹7,200');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Stone for room estimate' }), 'rajnagar-white');
    const rate = screen.getByRole('spinbutton', { name: 'Selected rate per square foot' });
    await user.clear(rate);
    await user.type(rate, '100');

    expect(result.textContent).toContain('Rajnagar White');
    expect(result.textContent).toContain('₹12,000');

    const wastage = screen.getByRole('spinbutton', { name: 'Wastage allowance percent' });
    await user.clear(wastage);
    await user.type(wastage, '10');
    expect(result.textContent).toContain('132 sq. ft.');
    expect(result.textContent).toContain('₹13,200');
    expect(screen.getByText(/Taxes, installation, transport, and other charges are not included/i)).not.toBeNull();
  });

  it('submits a complete quotation request and confirms success only after the API accepts it', async () => {
    const user = userEvent.setup();
    render(<App />);
    const name = await screen.findByLabelText('Your name *');
    const email = screen.getByLabelText('Email address *');
    const phone = screen.getByLabelText('Phone number *');
    const location = screen.getByLabelText('Project location *');

    await user.type(name, 'Asha Rao');
    await user.type(email, 'asha@example.com');
    await user.type(phone, '+91 98765 43210');
    await user.type(location, 'Bengaluru, Indiranagar');
    await user.type(screen.getByLabelText('Length (ft)'), '12');
    await user.type(screen.getByLabelText('Width (ft)'), '10');
    await user.type(screen.getByLabelText('Notes Optional'), 'Kitchen floor');

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'quote-test-id', status: 'received', message: 'Request received.' }),
    });
    await user.click(screen.getByRole('button', { name: 'Request a quotation' }));

    expect(await screen.findByRole('heading', { name: 'Thank you for sharing your project.' })).not.toBeNull();
    expect(screen.getByText('Request received.')).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, requestOptions] = fetch.mock.calls[1];
    expect(requestOptions.method).toBe('POST');
    expect(JSON.parse(requestOptions.body)).toMatchObject({
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '+91 98765 43210',
      projectLocation: 'Bengaluru, Indiranagar',
      stoneId: 'morchana-white',
      roomDimensions: { lengthFeet: 12, widthFeet: 10 },
    });
    expect(screen.getByRole('button', { name: 'Send another request' })).not.toBeNull();
  });

  it('shows inline required-field errors and does not call the API for an invalid form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Your name *');
    await user.click(screen.getByRole('button', { name: 'Request a quotation' }));

    expect(screen.getByText('Enter your name (2 to 100 characters).')).not.toBeNull();
    expect(screen.getByText('Enter a valid email address.')).not.toBeNull();
    expect(screen.getByText('Enter a valid phone number with 7 to 15 digits.')).not.toBeNull();
    expect(screen.getByText('Enter a project location (up to 200 characters).')).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows an API failure and allows the customer to retry without a false success', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('Your name *'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email address *'), 'asha@example.com');
    await user.type(screen.getByLabelText('Phone number *'), '+91 98765 43210');
    await user.type(screen.getByLabelText('Project location *'), 'Bengaluru');

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Quotation service is temporarily unavailable.' }),
    });
    await user.click(screen.getByRole('button', { name: 'Request a quotation' }));

    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable');
    expect(screen.queryByRole('heading', { name: 'Thank you for sharing your project.' })).toBeNull();
    expect(screen.getByLabelText('Your name *').value).toBe('Asha Rao');
  });

  it('disables repeat submission while the quotation request is in progress', async () => {
    const user = userEvent.setup();
    let completeRequest;
    const pendingResponse = new Promise((resolve) => { completeRequest = resolve; });
    render(<App />);
    await user.type(await screen.findByLabelText('Your name *'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email address *'), 'asha@example.com');
    await user.type(screen.getByLabelText('Phone number *'), '+91 98765 43210');
    await user.type(screen.getByLabelText('Project location *'), 'Bengaluru');
    fetch.mockReturnValueOnce(pendingResponse);

    await user.click(screen.getByRole('button', { name: 'Request a quotation' }));
    const sendingButton = screen.getByRole('button', { name: 'Sending request…' });
    expect(sendingButton.disabled).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);

    completeRequest({ ok: true, json: async () => ({ status: 'received' }) });
    expect(await screen.findByRole('heading', { name: 'Thank you for sharing your project.' })).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows a protected operator review summary without customer contact details', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('Development operator token'), 'local-test-token-only');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 'quote-12345678',
        customerName: 'Review Customer',
        stone: { id: 'morchana-white', name: 'Morchana White' },
        projectLocation: 'Jaipur sample site',
        roomDimensions: { lengthFeet: 14, widthFeet: 9 },
        createdAt: '2026-10-11T12:00:00.000Z',
      }],
    });
    await user.click(screen.getByRole('button', { name: 'Review requests' }));

    expect(await screen.findByRole('heading', { name: 'Review Customer' })).not.toBeNull();
    expect(screen.getByText('Request quote-12345678')).not.toBeNull();
    expect(screen.getAllByText('Morchana White').length).toBeGreaterThan(0);
    expect(screen.getByText('Jaipur sample site')).not.toBeNull();
    expect(screen.getByText('14 × 9 ft')).not.toBeNull();
    expect(screen.getByText(/Email addresses and phone numbers are intentionally omitted/i)).not.toBeNull();
    expect(screen.queryByText('private-review@example.test')).toBeNull();
    expect(screen.queryByText('+91 99999 11111')).toBeNull();
  });

  it('shows a clear unauthorized operator state without rendering request records', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText('Development operator token'), 'incorrect-token');
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'A valid local operator token is required.' }),
    });
    await user.click(screen.getByRole('button', { name: 'Review requests' }));

    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Access denied');
    expect(screen.getByText('Requests are hidden until local access succeeds.')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Review Customer' })).toBeNull();
  });

  it('shows loading, empty and API failure states for operator review', async () => {
    const user = userEvent.setup();
    let completeRequest;
    render(<App />);
    await user.type(await screen.findByLabelText('Development operator token'), 'local-test-token-only');
    fetch.mockReturnValueOnce(new Promise((resolve) => { completeRequest = resolve; }));
    await user.click(screen.getByRole('button', { name: 'Review requests' }));

    expect(screen.getByRole('button', { name: 'Checking access…' }).disabled).toBe(true);
    expect(screen.getByText('Checking local access and loading requests…')).not.toBeNull();
    completeRequest({ ok: true, json: async () => [] });
    expect(await screen.findByText('No quotation requests yet')).not.toBeNull();

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Local operator review is not configured.' }),
    });
    await user.click(screen.getByRole('button', { name: 'Refresh requests' }));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('OPERATOR_REVIEW_TOKEN');
  });

  it('shows the protected activity log with event summaries and server timestamps only', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.type(await screen.findByLabelText('Development operator token'), 'local-test-token-only');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    await user.click(screen.getByRole('button', { name: 'Review requests' }));
    expect(await screen.findByText('No quotation requests yet')).not.toBeNull();

    let completeActivity;
    fetch.mockReturnValueOnce(new Promise((resolve) => { completeActivity = resolve; }));
    await user.click(screen.getByRole('button', { name: 'Load activity' }));
    expect(screen.getByText('Loading recent activity…')).not.toBeNull();
    completeActivity({ ok: true, json: async () => [{
      type: 'quotation-submitted',
      requestId: 'quote-activity-1',
      stone: { id: 'morchana-white', name: 'Morchana White' },
      timestamp: '2026-10-11T12:00:00.000Z',
    }] });

    expect(await screen.findByText('Quotation request received')).not.toBeNull();
    expect(screen.getByText('Morchana White · Request quote-activity-1')).not.toBeNull();
    expect(container.querySelector('time[datetime="2026-10-11T12:00:00.000Z"]')).not.toBeNull();
    expect(screen.queryByText('private-activity@example.test')).toBeNull();
    expect(screen.queryByText('+91 77777 22222')).toBeNull();

    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'Local operator review is not configured.' }) });
    await user.click(screen.getByRole('button', { name: 'Refresh activity' }));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('OPERATOR_REVIEW_TOKEN');
  });

  it('shows an empty activity state and records a user stone selection without customer fields', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Morchana White' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Stone for room estimate' }), 'rajnagar-white');

    const selectionCall = fetch.mock.calls.find(([url]) => url === '/api/activity/selections');
    expect(selectionCall).not.toBeUndefined();
    expect(JSON.parse(selectionCall[1].body)).toEqual({ stoneId: 'rajnagar-white' });

    await user.type(screen.getByLabelText('Development operator token'), 'local-test-token-only');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    await user.click(screen.getByRole('button', { name: 'Review requests' }));
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    await user.click(await screen.findByRole('button', { name: 'Load activity' }));
    expect(await screen.findByText('No recent activity yet.')).not.toBeNull();
  });
});
