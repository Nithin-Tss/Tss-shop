import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useIsSupportStaff } from "@/lib/auth";
import { SUPPORT_SUMMARY_API, usePoll } from "@/lib/supportTickets";

export const BADGE_POLL_MS = 30000;

// How many tickets are open and unassigned (the number on the "Support Tickets" nav item). Always 0 for anyone who
// is not support staff, and nothing is requested for them.
export function useSupportBadge() {
  const staff = useIsSupportStaff();
  const [count, setCount] = useState(0);

  const load = async () => {
    const res = await apiGet(SUPPORT_SUMMARY_API);
    if (res.ok) setCount(Number(res.data?.openUnassigned) || 0);
  };

  useEffect(() => {
    if (!staff) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [staff]);

  usePoll(load, BADGE_POLL_MS, staff);
  return staff ? count : 0;
}
