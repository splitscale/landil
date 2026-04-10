"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// ── Role donut ──────────────────────────────────────────────────────────────

const ROLE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];

const roleConfig: ChartConfig = {
  buyer: { label: "Buyers" },
  seller: { label: "Sellers" },
  admin: { label: "Admins" },
};

export function RoleDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartContainer config={roleConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
          ))}
        </Pie>
        <Legend iconType="circle" iconSize={8} formatter={(v) => roleConfig[v]?.label ?? v} />
      </PieChart>
    </ChartContainer>
  );
}

// ── Listing status donut ────────────────────────────────────────────────────

const STATUS_COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

const statusConfig: ChartConfig = {
  published: { label: "Published" },
  draft: { label: "Drafts" },
};

export function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartContainer config={statusConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
          ))}
        </Pie>
        <Legend iconType="circle" iconSize={8} formatter={(v) => statusConfig[v]?.label ?? v} />
      </PieChart>
    </ChartContainer>
  );
}

// ── Signups bar chart ────────────────────────────────────────────────────────

const signupsConfig: ChartConfig = {
  signups: { label: "Signups" },
};

export function SignupsBar({ data }: { data: { date: string; signups: number }[] }) {
  return (
    <ChartContainer config={signupsConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Listings bar chart ───────────────────────────────────────────────────────

const listingsConfig: ChartConfig = {
  listings: { label: "Listings" },
};

export function ListingsBar({ data }: { data: { date: string; listings: number }[] }) {
  return (
    <ChartContainer config={listingsConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="listings" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
