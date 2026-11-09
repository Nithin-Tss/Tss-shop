import { useEffect, useRef, useState } from "react";

// Pieces shared by the Analytics page and the report pages: date ranges, menus, charts.

export const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const card =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)]";
export const cardHeading = "text-sm font-semibold text-ink";
export const smallLabel = "text-[12px] text-slate-600";
export const outlineButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-ink transition-colors duration-200 hover:border-orange-600 hover:bg-slate-100";
export const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-ink transition-colors duration-200 hover:border-orange-600 hover:bg-slate-100";
export const menuPanel =
  "absolute z-30 mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_-8px_rgba(24,24,27,0.2)]";

export const REFRESH_MS = 60_000;
export const COMPARE_OPTIONS = [
  { value: "previous_period", label: "Previous period" },
  { value: "previous_year", label: "Previous year" },
  { value: "none", label: "No comparison" },
];

// ---- dates (plain YYYY-MM-DD strings, so no timezone shifts) ---------------------------

export const pad = (n) => String(n).padStart(2, "0");
export const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const fromDate = (dt) => iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
export const addDays = (s, n) => fromDate(new Date(parse(s).getTime() + n * 86_400_000));

// Today's date in the store's timezone (the browser's until the first answer says which)
export function todayIn(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

export const PRESETS = [
  { key: "today", label: "Today", range: (t) => [t, t] },
  { key: "yesterday", label: "Yesterday", range: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: "7d", label: "Last 7 days", range: (t) => [addDays(t, -6), t] },
  { key: "30d", label: "Last 30 days", range: (t) => [addDays(t, -29), t] },
  { key: "90d", label: "Last 90 days", range: (t) => [addDays(t, -89), t] },
  { key: "365d", label: "Last 365 days", range: (t) => [addDays(t, -364), t] },
  { key: "mtd", label: "Month to date", range: (t) => [`${t.slice(0, 8)}01`, t] },
  { key: "ytd", label: "Year to date", range: (t) => [`${t.slice(0, 4)}-01-01`, t] },
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const shortDate = (s) =>
  parse(s).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const rangeLabel = (from, to) =>
  from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;

// ---- number formatting -----------------------------------------------------------------

export const percent = (v) => `${Number(v || 0).toFixed(v % 1 ? 1 : 0)}%`;
export const whole = (v) => Number(v || 0).toLocaleString("en");

export function Delta({ change }) {
  if (change === null || change === undefined) return <span className={smallLabel}>—</span>;
  const up = change >= 0;
  return (
    <span className={`text-[12px] font-medium ${up ? "text-emerald-700" : "text-red-700"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
}

// ---- icons / small pieces --------------------------------------------------------------

export function Chevron() {
  return (
    <svg {...lineIcon} className="h-3.5 w-3.5 text-slate-600">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function EmptyState({ children = "No data for this date range" }) {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center text-center">
      <svg {...lineIcon} className="h-6 w-6 text-slate-400">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M18 17V9M13 17V5M8 17v-3" />
      </svg>
      <p className="mt-2 text-[13px] text-slate-600">{children}</p>
    </div>
  );
}

export function useClickAway(ref, onAway) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onAway();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onAway]);
}

// ---- charts ----------------------------------------------------------------------------

export function Sparkline({ values }) {
  if (!values.length) return <div className="h-8" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
    return `${x.toFixed(1)},${(30 - ((v - min) / span) * 28).toFixed(1)}`;
  });
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#FB923C"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function bucketLabel(bucket, hourly) {
  if (hourly) {
    const h = Number(bucket.slice(11, 13));
    return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
  }
  return parse(bucket.slice(0, 10)).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Solid line for the current period, dashed for the comparison one.
export function LineChart({ series, comparison, field, format, hourly }) {
  const W = 640;
  const H = 220;
  const left = 56;
  const bottom = 24;
  const cur = series.map((r) => Number(r[field]) || 0);
  const prev = (comparison || []).map((r) => Number(r[field]) || 0);
  const max = Math.max(...cur, ...prev, 1);
  const n = Math.max(cur.length, prev.length);
  const x = (i) => left + (n <= 1 ? (W - left) / 2 : (i / (n - 1)) * (W - left - 8));
  const y = (v) => 8 + (1 - v / max) * (H - bottom - 16);
  const path = (vals) =>
    vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelAt = [0, Math.floor((n - 1) / 2), n - 1].filter(
    (v, i, a) => v >= 0 && a.indexOf(v) === i
  );
  const [hover, setHover] = useState(null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full"
        role="img"
        aria-label="Line chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          setHover(
            Math.min(Math.max(Math.round(((px - left) / (W - left - 8)) * (n - 1)), 0), n - 1)
          );
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={W}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(24,24,27,0.12)"
              strokeWidth="1"
            />
            <text
              x={left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="rgba(24,24,27,0.78)"
            >
              {format(t, true)}
            </text>
          </g>
        ))}
        {labelAt.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize="10"
            fill="rgba(24,24,27,0.78)"
          >
            {series[i] ? bucketLabel(series[i].bucket, hourly) : ""}
          </text>
        ))}
        {prev.length > 0 && (
          <path
            d={path(prev)}
            fill="none"
            stroke="rgba(24,24,27,0.5)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}
        <path d={path(cur)} fill="none" stroke="#EA580C" strokeWidth="2" />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1="8"
            y2={H - bottom}
            stroke="rgba(24,24,27,0.5)"
            strokeWidth="1"
          />
        )}
      </svg>
      {hover !== null && series[hover] && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-md">
          <p className="font-medium text-ink">
            {bucketLabel(series[hover].bucket, hourly)}: {format(cur[hover])}
          </p>
          {comparison?.[hover] && (
            <p className="text-slate-600">
              {bucketLabel(comparison[hover].bucket, hourly)}: {format(prev[hover])}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- date range picker -----------------------------------------------------------------

export function Month({ year, month, start, end, onPick }) {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="w-56">
      <p className="mb-2 text-center text-sm font-semibold text-ink">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] text-slate-600">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const day = iso(year, month, d);
          const ends = day === start || day === end;
          const inside = start && end && day > start && day < end;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(day)}
              className={`h-8 text-[13px] ${ends ? "rounded-lg bg-ink font-semibold text-white" : inside ? "bg-slate-100 text-ink" : "rounded-lg text-ink hover:bg-slate-100"}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CustomRange({ initial, today, onApply, onCancel }) {
  const [start, setStart] = useState(initial[0]);
  const [end, setEnd] = useState(initial[1]);
  const [view, setView] = useState(() => {
    const d = parse(initial[1] || today);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() - 1 };
  });
  const shift = (n) => {
    const d = new Date(Date.UTC(view.y, view.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const next = new Date(Date.UTC(view.y, view.m + 1, 1));
  const pick = (day) => {
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (day < start) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
  };

  return (
    <div className="p-3">
      <div className="flex items-start gap-4">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="mt-0.5 h-7 w-7 rounded-lg hover:bg-slate-100"
        >
          ‹
        </button>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Month year={view.y} month={view.m} start={start} end={end} onPick={pick} />
          <Month
            year={next.getUTCFullYear()}
            month={next.getUTCMonth()}
            start={start}
            end={end}
            onPick={pick}
          />
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shift(1)}
          className="mt-0.5 h-7 w-7 rounded-lg hover:bg-slate-100"
        >
          ›
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className={smallLabel}>
          {start ? rangeLabel(start, end || start) : "Pick a start date"}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={outlineButton}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!start}
            onClick={() => onApply(start, end || start)}
            className="inline-flex h-9 items-center rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function DateRangeButton({ label, preset, range, today, onPreset, onCustom }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const ref = useRef(null);
  const close = () => {
    setOpen(false);
    setCustom(false);
  };
  useClickAway(ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={chip}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {label} <Chevron />
      </button>
      {open && (
        <div className={`${menuPanel} left-0 ${custom ? "w-[min(34rem,90vw)]" : "w-52"}`}>
          {custom ? (
            <CustomRange
              initial={range}
              today={today}
              onCancel={() => setCustom(false)}
              onApply={(a, b) => {
                onCustom(a, b);
                close();
              }}
            />
          ) : (
            <>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    onPreset(p.key);
                    close();
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-100 ${preset === p.key ? "font-semibold" : ""}`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-100 ${preset === "custom" ? "font-semibold" : ""}`}
              >
                Custom range
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Menu({ label, ariaLabel, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={className}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className={`${menuPanel} right-0 w-56`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export const menuItem =
  "block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-100";
