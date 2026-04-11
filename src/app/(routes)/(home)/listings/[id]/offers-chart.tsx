"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
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
type Bucket = { label: string; pending: number; accepted: number; rejected: number };

const chartConfig: ChartConfig = {
  pending:  { label: "Pending",  color: "var(--chart-3)" },
  accepted: { label: "Accepted", color: "var(--chart-1)" },
  rejected: { label: "Rejected", color: "var(--destructive)" },
};

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };

export default function OffersChart({ listingId }: { listingId: string }) {
  const [win, setWin] = useState<WindowValue>("7d");
  const [data, setData] = useState<Bucket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/listings/${listingId}/offers-chart?window=${win}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData(d.buckets ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [listingId, win]);

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground">Offers received</p>
          <p className="text-lg font-semibold tabular-nums">
            {loading ? "—" : total}
          </p>
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

      {/* Chart */}
      {loading ? (
        <div className="flex h-[160px] items-center justify-center">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[160px] items-center justify-center">
          <p className="text-xs text-muted-foreground">No offers in this period</p>
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
            <Bar dataKey="pending"  fill="var(--chart-3)" radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="accepted" fill="var(--chart-1)" radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="rejected" fill="var(--destructive)" radius={[3, 3, 0, 0]} stackId="a" />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
