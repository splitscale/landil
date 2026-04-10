"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type NameValue = { name: string; value: number };
type DateCount = { date: string; [key: string]: number | string };

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };
const legendStyle = { color: "var(--muted-foreground)", fontSize: 12 };

// ── Generic donut ────────────────────────────────────────────────────────────

function DonutChart({ config, data }: { config: ChartConfig; data: NameValue[] }) {
  return (
    <ChartContainer config={config} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={config[entry.name]?.color ?? "var(--muted-foreground)"} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => config[v]?.label ?? v}
          wrapperStyle={legendStyle}
        />
      </PieChart>
    </ChartContainer>
  );
}

// ── Generic bar ──────────────────────────────────────────────────────────────

function TimeSeriesBar({ config, data, dataKey }: { config: ChartConfig; data: DateCount[]; dataKey: string }) {
  const color = config[dataKey]?.color ?? "var(--chart-1)";
  return (
    <ChartContainer config={config} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Configured exports ───────────────────────────────────────────────────────

const roleConfig: ChartConfig = {
  buyer:  { label: "Buyers",  color: "var(--chart-1)" },
  seller: { label: "Sellers", color: "var(--chart-2)" },
  admin:  { label: "Admins",  color: "var(--chart-3)" },
};

const statusConfig: ChartConfig = {
  published: { label: "Published", color: "var(--chart-1)" },
  draft:     { label: "Drafts",    color: "var(--chart-4)" },
};

const signupsConfig: ChartConfig  = { signups:  { label: "Signups",  color: "var(--chart-1)" } };
const listingsConfig: ChartConfig = { listings: { label: "Listings", color: "var(--chart-2)" } };

export const RoleDonut   = ({ data }: { data: NameValue[] }) => <DonutChart config={roleConfig} data={data} />;
export const StatusDonut = ({ data }: { data: NameValue[] }) => <DonutChart config={statusConfig} data={data} />;
export const SignupsBar  = ({ data }: { data: DateCount[] }) => <TimeSeriesBar config={signupsConfig} data={data} dataKey="signups" />;
export const ListingsBar = ({ data }: { data: DateCount[] }) => <TimeSeriesBar config={listingsConfig} data={data} dataKey="listings" />;
