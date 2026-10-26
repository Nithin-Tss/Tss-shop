import { formatMoney } from "@/lib/reportsApi";

// Daily sales as bars. `series` is [{ date, sales, orders }].
export default function SalesChart({ series, currency }) {
  const max = Math.max(...series.map((d) => Number(d.sales) || 0), 1);

  return (
    <div
      className="flex h-full w-full items-end gap-1 px-2 pb-2"
      role="img"
      aria-label="Sales by day"
    >
      {series.map((day) => {
        const value = Number(day.sales) || 0;
        return (
          <div
            key={day.date}
            title={`${day.date}: ${formatMoney(value, currency)} · ${day.orders} orders`}
            className="min-w-[3px] flex-1 rounded-t bg-sky-400 hover:bg-sky-500"
            style={{ height: `${Math.max((value / max) * 100, 2)}%` }}
          />
        );
      })}
    </div>
  );
}
