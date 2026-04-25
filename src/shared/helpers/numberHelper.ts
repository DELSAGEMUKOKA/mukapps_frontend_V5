export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function calcMargin(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0;
  return round(((sellingPrice - costPrice) / sellingPrice) * 100);
}

export function calcMarkup(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0;
  return round(((sellingPrice - costPrice) / costPrice) * 100);
}
