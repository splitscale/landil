"use client";

import { useState, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const WINDOWS = [
  { label: "Last 1h",  value: "1h"  },
  { label: "Last 24h", value: "1d"  },
  { label: "Last 7d",  value: "7d"  },
  { label: "Last 30d", value: "30d" },
] as const;

type WindowValue = (typeof WINDOWS)[number]["value"];

type Bucket = {
  label: string;
  clicks: number;
  reach: number;
  offers: number;
};

const chartConfig = {
  clicks: { label: "Clicks",  color: "var(--chart-1)" },
  reach:  { label: "Reach",   color: "var(--chart-2)" },
  offers: { label: "Offers",  color: "var(--chart-3)" },
} satisfies ChartConfig;

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };

export default function DashboardCharts() {
  const [win, setWin] = useState<WindowValue>("7d");
  const [data, setData] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/analytics/dashboard?window=${win}`)
      .then((r) => r.json())
      .then((d: { views?: { label: string; clicks: number; reach: number }[]; offers?: { label: string; total: number }[] }) => {
        if (cancelled) return;

        // Merge views + offers into a single series keyed by label
        const map = new Map<string, Bucket>();

        for (const v of d.views ?? []) {
          map.set(v.label, { label: v.label, clicks: v.clicks, reach: v.reach, offers: 0 });
        }
        for (const o of d.offers ?? []) {
          const existing = map.get(o.label);
          if (existing) {
            existing.offers = o.total;
          } else {
            map.set(o.label, { label: o.label, clicks: 0, reach: 0, offers: o.total });
          }
        }

        // Sort chronologically (labels are already formatted strings, but the map insertion order
        // from views is correct since the API orders by bucket)
        setData(Array.from(map.values()));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [win]);

  const selectedLabel = WINDOWS.find((w) => w.value === win)?.label ?? "Last 7d";

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
          <CardDescription className="text-xs">
            {selectedLabel} — clicks, reach &amp; offers
          </CardDescription>
        </div>
        <Select value={win} onValueChange={(v) => setWin(v as WindowValue)}>
          <SelectTrigger className="w-[140px] rounded-lg sm:ml-auto" aria-label="Time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {WINDOWS.map((w) => (
              <SelectItem key={w.value} value={w.value} className="rounded-lg">
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-xs text-muted-foreground">No data for this period</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-clicks)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-reach)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-reach)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillOffers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-offers)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-offers)" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <YAxis
                allowDecimals={false}
                domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.3), dataMax + 2)]}
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelKey="label"
                    labelFormatter={(_, payload) => {
                      const label = payload?.[0]?.payload?.label as string | undefined;
                      return label ?? "";
                    }}
                  />
                }
              />
              <Area dataKey="offers" type="monotone" fill="url(#fillOffers)" stroke="var(--color-offers)" strokeWidth={2} stackId="a" />
              <Area dataKey="reach"  type="monotone" fill="url(#fillReach)"  stroke="var(--color-reach)"  strokeWidth={2} stackId="a" />
              <Area dataKey="clicks" type="monotone" fill="url(#fillClicks)" stroke="var(--color-clicks)" strokeWidth={2} stackId="a" />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
