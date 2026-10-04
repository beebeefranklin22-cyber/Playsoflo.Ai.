import { useEffect, useRef, useState } from "react";

/**
 * Watches an already-fetched/filtered/geofenced list (whatever the caller's
 * own query already produces) and surfaces whichever item wasn't present on
 * a previous run as a "new arrival" — so a page can fire a one-at-a-time
 * urgent alert without re-deriving its own list logic. The first list a
 * given mount sees is treated as already-seen, not new, so existing backlog
 * never triggers a false alert on page load.
 */
export function useNewArrivalAlert(items, getId) {
  const seenIds = useRef(null);
  const [newItem, setNewItem] = useState(null);

  useEffect(() => {
    if (!Array.isArray(items)) return;
    const currentIds = new Set(items.map(getId));

    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }

    const arrived = items.find((item) => !seenIds.current.has(getId(item)));
    seenIds.current = currentIds;
    if (arrived) setNewItem(arrived);
  }, [items]);

  return [newItem, () => setNewItem(null)];
}
