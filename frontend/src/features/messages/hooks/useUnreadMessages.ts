import { useEffect, useState } from "react";
import client from "@/shared/lib/api-client";
import { loadSession } from "@/shared/lib/session";
import { MESSAGES_POLL_INTERVAL_MS } from "../constants/messages-polling";

/**
 * Whether the signed-in user has unread messages. Re-checks on an interval, when the window
 * regains focus, on the `messagesUpdated` window event, and whenever `pathname` changes. `enabled: false`
 * skips it (e.g. workspace members without a creator profile, who have no chat).
 */
export function useUnreadMessages(pathname: string, enabled = true): boolean {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function checkUnread() {
      const session = loadSession();
      if (!session) {
        if (!cancelled) setHasUnread(false);
        return;
      }
      try {
        const { data } = await client.GET("/messages/unread");
        if (!cancelled && data) {
          setHasUnread(Boolean(data.has_unread));
        }
      } catch {
        // ignore errors
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, MESSAGES_POLL_INTERVAL_MS);

    const onUpdate = () => checkUnread();
    window.addEventListener("messagesUpdated", onUpdate);
    window.addEventListener("focus", onUpdate);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("messagesUpdated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [pathname, enabled]);

  return hasUnread;
}
