export function validateQuoteForm(form, stones) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const projectLocation = form.projectLocation.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (name.length < 2 || name.length > 100) errors.name = 'Enter your name (2 to 100 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid phone number with 7 to 15 digits.';
  }
  if (projectLocation.length < 2 || projectLocation.length > 200) {
    errors.projectLocation = 'Enter a project location (up to 200 characters).';
  }
  if (form.notes.trim().length > 1000) errors.notes = 'Keep notes to 1,000 characters or fewer.';

  const stone = stones.find((item) => item.id === form.stoneId);
  if (!stone || stone.availability !== 'available') errors.stoneId = 'Choose a stone that is currently available for quotation.';

  const hasLength = form.roomLengthFeet !== '';
  const hasWidth = form.roomWidthFeet !== '';
  const length = Number(form.roomLengthFeet);
  const width = Number(form.roomWidthFeet);
  if (hasLength !== hasWidth || (hasLength && (!Number.isFinite(length) || length <= 0))
    || (hasWidth && (!Number.isFinite(width) || width <= 0))) {
    errors.roomDimensions = 'Enter both room dimensions as positive finite feet values, or leave both empty.';
  }

  return { valid: Object.keys(errors).length === 0, errors, stone };
}

export function createQuotePayload(form, stone) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    projectLocation: form.projectLocation.trim(),
    notes: form.notes.trim(),
    stoneId: stone.id,
    ...(form.roomLengthFeet !== '' && form.roomWidthFeet !== '' ? {
      roomDimensions: {
        lengthFeet: Number(form.roomLengthFeet),
        widthFeet: Number(form.roomWidthFeet),
      },
    } : {}),
  };
}
