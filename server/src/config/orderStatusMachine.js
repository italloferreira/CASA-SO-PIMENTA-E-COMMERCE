export const DELIVERY_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

export const PICKUP_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['withdrawn', 'cancelled'],
  withdrawn: [],
  cancelled: []
};

export function canTransition(currentStatus, nextStatus, deliveryType) {
  const flow = deliveryType === 'pickup' ? PICKUP_FLOW : DELIVERY_FLOW;
  const allowed = flow[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
}

export function isValidStatusForType(status, deliveryType) {
  const flow = deliveryType === 'pickup' ? PICKUP_FLOW : DELIVERY_FLOW;
  return status in flow;
}
