"use client";

import {
  PieChart,
  Pie,
  Cell,
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

// ── Role donut ──────────────────────────────────────────────────────────────

const roleConfig: ChartConfig = {
  buyer:  { label: "Buyers",  color: "var(--muted-foreground)" },
  seller: { label: "Sellers", color: "var(--primary)" },
  admin:  { label: "Admins",  color: "var(--destructive)" },
};

export function RoleDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartContainer config={roleConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={roleConfig[entry.name]?.color ?? "var(--muted-foreground)"} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => roleConfig[v]?.label ?? v}
          wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }}
        />
      </PieChart>
    </ChartContainer>
  );
}

// ── Listing status donut ────────────────────────────────────────────────────

const statusConfig: ChartConfig = {
  published: { label: "Published", color: "var(--primary)" },
  draft:     { label: "Drafts",    color: "var(--muted-foreground)" },
};

export function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartContainer config={statusConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={statusConfig[entry.name]?.color ?? "var(--muted-foreground)"} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => statusConfig[v]?.label ?? v}
          wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }}
        />
      </PieChart>
    </ChartContainer>
  );
}

// ── Shared axis props ────────────────────────────────────────────────────────

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 10 };

// ── Signups bar chart ────────────────────────────────────────────────────────

const signupsConfig: ChartConfig = {
  signups: { label: "Signups", color: "var(--primary)" },
};

export function SignupsBar({ data }: { data: { date: string; signups: number }[] }) {
  return (
    <ChartContainer config={signupsConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signups" fill="var(--primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// ── Listings bar chart ───────────────────────────────────────────────────────

const listingsConfig: ChartConfig = {
  listings: { label: "Listings", color: "var(--primary)" },
};

export function ListingsBar({ data }: { data: { date: string; listings: number }[] }) {
  return (
    <ChartContainer config={listingsConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="listings" fill="var(--primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
