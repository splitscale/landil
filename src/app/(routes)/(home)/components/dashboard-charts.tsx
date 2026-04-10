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
type ViewBucket  = { label: string; clicks: number; reach: number };
type OfferBucket = { label: string; total: number };

const viewsConfig: ChartConfig = {
  clicks: { label: "Clicks", color: "var(--chart-1)" },
  reach:  { label: "Reach",  color: "var(--chart-2)" },
};

const offersConfig: ChartConfig = {
  total: { label: "Offers", color: "var(--chart-3)" },
};

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };

function FilterTabs({
  value,
  onChange,
}: {
  value: WindowValue;
  onChange: (v: WindowValue) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {WINDOWS.map((w) => (
        <button
          key={w.value}
          onClick={() => onChange(w.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === w.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

function ChartShell({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) return (
    <div className="flex h-[160px] items-center justify-center">
      <Loader2 size={16} className="animate-spin text-muted-foreground" />
    </div>
  );
  if (empty) return (
    <div className="flex h-[160px] items-center justify-center">
      <p className="text-xs text-muted-foreground">No data for this period</p>
    </div>
  );
  return <>{children}</>;
}

export default function DashboardCharts() {
  const [win, setWin] = useState<WindowValue>("7d");
  const [views, setViews]   = useState<ViewBucket[]>([]);
  const [offers, setOffers] = useState<OfferBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analytics/dashboard?window=${win}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setViews(d.views ?? []);
        setOffers(d.offers ?? []);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [win]);

  return (
    <div className="space-y-3">
      {/* Shared filter row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Activity
        </p>
        <FilterTabs value={win} onChange={setWin} />
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Views */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-medium">Reach &amp; Clicks</p>
          <ChartShell loading={loading} empty={!loading && views.length === 0}>
            <ChartContainer config={viewsConfig} className="h-[160px] w-full">
              <BarChart data={views} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 11 }} />
                <Bar dataKey="clicks" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reach"  fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </ChartShell>
        </div>

        {/* Offers */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-medium">Offers received</p>
          <ChartShell loading={loading} empty={!loading && offers.length === 0}>
            <ChartContainer config={offersConfig} className="h-[160px] w-full">
              <BarChart data={offers} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </ChartShell>
        </div>
      </div>
    </div>
  );
}
