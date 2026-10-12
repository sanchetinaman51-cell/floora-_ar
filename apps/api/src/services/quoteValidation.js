import { getStoneById } from '../repositories/stoneRepository.js';

function trimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveFeet(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export async function validateQuoteRequest(payload, findStone = getStoneById) {
  const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const fields = {};
  const name = trimmedString(input.name);
  const email = trimmedString(input.email);
  const phone = trimmedString(input.phone);
  const projectLocation = trimmedString(input.projectLocation);
  const notes = trimmedString(input.notes);
  const stoneId = trimmedString(input.stoneId);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = phone.replace(/\D/g, '');
  const phonePattern = /^\+?[\d\s().-]+$/;

  if (name.length < 2 || name.length > 100) fields.name = 'Enter your name (2 to 100 characters).';
  if (!emailPattern.test(email) || email.length > 254) fields.email = 'Enter a valid email address.';
  if (!phonePattern.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    fields.phone = 'Enter a valid phone number with 7 to 15 digits.';
  }
  if (projectLocation.length < 2 || projectLocation.length > 200) {
    fields.projectLocation = 'Enter a project location (up to 200 characters).';
  }
  if (notes.length > 1000) fields.notes = 'Keep notes to 1,000 characters or fewer.';

  const stone = stoneId ? await findStone(stoneId) : undefined;
  if (!stone || stone.availability !== 'available') {
    fields.stoneId = 'Choose a stone that is currently available for quotation.';
  }

  let roomDimensions;
  if (input.roomDimensions !== undefined && input.roomDimensions !== null) {
    const room = input.roomDimensions;
    if (typeof room !== 'object' || Array.isArray(room)) {
      fields.roomLengthFeet = 'Enter both room dimensions as positive finite feet values, or leave both empty.';
      fields.roomWidthFeet = 'Enter both room dimensions as positive finite feet values, or leave both empty.';
    } else {
      const length = positiveFeet(room.lengthFeet);
      const width = positiveFeet(room.widthFeet);
      const lengthProvided = room.lengthFeet !== '' && room.lengthFeet !== null && room.lengthFeet !== undefined;
      const widthProvided = room.widthFeet !== '' && room.widthFeet !== null && room.widthFeet !== undefined;

      if (lengthProvided !== widthProvided || (lengthProvided && length === null) || (widthProvided && width === null)) {
        fields.roomLengthFeet = 'Enter both room dimensions as positive finite feet values, or leave both empty.';
        fields.roomWidthFeet = 'Enter both room dimensions as positive finite feet values, or leave both empty.';
      } else if (length !== null && width !== null) {
        roomDimensions = { lengthFeet: length, widthFeet: width };
      }
    }
  }

  if (Object.keys(fields).length > 0) return { valid: false, fields };

  return {
    valid: true,
    fields: {},
    value: {
      name,
      email,
      phone,
      projectLocation,
      notes,
      stoneId: stone.id,
      stoneName: stone.name,
      ...(roomDimensions ? { roomDimensions } : {}),
    },
  };
}
