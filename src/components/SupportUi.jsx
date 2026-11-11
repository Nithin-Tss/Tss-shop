import {
  PRIORITY_TONE,
  STATUS_TONE,
  categoryLabel,
  priorityLabel,
  sourceLabel,
  statusLabel,
} from "@/lib/supportTickets";

// Small pieces shared by the staff pages: chips, form-control styles
export const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-600";
export const secondaryButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

const chip = "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export const StatusBadge = ({ status }) => (
  <span className={`${chip} ${STATUS_TONE[status] || STATUS_TONE.closed}`}>
    {statusLabel(status)}
  </span>
);
export const PriorityBadge = ({ priority }) => (
  <span className={`${chip} ${PRIORITY_TONE[priority] || PRIORITY_TONE.normal}`}>
    {priorityLabel(priority)}
  </span>
);
export const SourceBadge = ({ source }) => (
  <span className={`${chip} bg-slate-100 text-slate-700`}>{sourceLabel(source)}</span>
);
export const CategoryText = ({ category }) => <span>{categoryLabel(category)}</span>;
