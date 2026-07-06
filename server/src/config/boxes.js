export const BOXES = [
  {
    id: 'P',
    width: 24,
    height: 16,
    length: 8,
    price: 7.40,
    maxWeight: Number(process.env.BOX_P_MAX_WEIGHT) || 1
  },
  {
    id: 'M',
    width: 30,
    height: 22,
    length: 13,
    price: 8.30,
    maxWeight: Number(process.env.BOX_M_MAX_WEIGHT) || 5
  },
  {
    id: 'G',
    width: 36,
    height: 28,
    length: 28,
    price: 15.35,
    maxWeight: Infinity
  }
];

export function selectBox(totalWeight) {
  for (const box of BOXES) {
    if (totalWeight <= box.maxWeight) return box;
  }
  return BOXES[BOXES.length - 1];
}
