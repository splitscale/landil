"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Loader2 } from "lucide-react";

const WINDOWS = [
  { label: "1h",  value: "1h"  },
  { label: "24h", value: "1d"  },
  { label: "7d",  value: "7d"  },
  { label: "30d", value: "30d" },
] as const;

type WindowValue = (typeof WINDOWS)[number]["value"];
type Bucket = { label: string; clicks: number; reach: number };

const chartConfig: ChartConfig = {
  clicks: { label: "Clicks", color: "var(--chart-1)" },
  reach:  { label: "Reach",  color: "var(--chart-2)" },
};

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };

export default function AnalyticsChart({ listingId }: { listingId: string }) {
  const [win, setWin] = useState<WindowValue>("7d");
  const [data, setData] = useState<Bucket[]>([]);
  const [totals, setTotals] = useState({ clicks: 0, reach: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/listings/${listingId}/analytics?window=${win}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData(d.buckets ?? []);
        setTotals(d.totals ?? { clicks: 0, reach: 0 });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [listingId, win]);

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground">Reach</p>
            <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--chart-2)" }}>
              {loading ? "—" : totals.reach}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
            <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--chart-1)" }}>
              {loading ? "—" : totals.clicks}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWin(w.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                win === w.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="flex h-[160px] items-center justify-center">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[160px] items-center justify-center">
          <p className="text-xs text-muted-foreground">No views in this period</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Bar dataKey="clicks" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="reach"  fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
