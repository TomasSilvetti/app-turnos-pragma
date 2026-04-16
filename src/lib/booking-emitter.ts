type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToNewBookings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitNewBooking() {
  listeners.forEach((fn) => fn());
}
