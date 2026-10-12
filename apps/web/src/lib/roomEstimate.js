const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function readPositiveNumber(value, field, errors) {
  if (value === '' || value === null || value === undefined) {
    errors[field] = 'Enter a value greater than zero.';
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    errors[field] = 'Enter a finite value greater than zero.';
    return null;
  }

  return number;
}

export function calculateRoomEstimate({ length, width, rate, price, wastagePercent = 0 }) {
  const errors = {};
  const lengthFeet = readPositiveNumber(length, 'length', errors);
  const widthFeet = readPositiveNumber(width, 'width', errors);
  const selectedRate = readPositiveNumber(rate, 'rate', errors);
  const rawWastage = wastagePercent === '' || wastagePercent === null ? 0 : Number(wastagePercent);

  if (!Number.isFinite(rawWastage) || rawWastage < 0 || rawWastage > 100) {
    errors.wastagePercent = 'Choose an allowance between 0% and 100%.';
  }

  if (!price || !Number.isFinite(price.min) || price.min <= 0) {
    errors.rate = 'A valid stone price is required.';
  } else if (selectedRate !== null && (selectedRate < price.min || (price.max !== null && selectedRate > price.max))) {
    errors.rate = price.max === null
      ? `Choose a rate of at least ₹${price.min} per sq. ft.`
      : `Choose a rate from ₹${price.min} to ₹${price.max} per sq. ft.`;
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  const area = lengthFeet * widthFeet;
  const wastageArea = area * (rawWastage / 100);
  const billableArea = area + wastageArea;
  const materialCost = billableArea * selectedRate;

  if (![area, wastageArea, billableArea, materialCost].every(Number.isFinite)) {
    return { valid: false, errors: { dimensions: 'These dimensions are too large to estimate safely.' } };
  }

  return {
    valid: true,
    errors: {},
    area,
    wastageArea,
    billableArea,
    rate: selectedRate,
    wastagePercent: rawWastage,
    materialCost,
  };
}

export function formatINR(amount) {
  return currencyFormatter.format(amount);
}
