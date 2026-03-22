import { type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

export const chartColors = [
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
];

export const chartTooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--foreground)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

export const chartItemStyle = { 
  color: "var(--foreground)", 
  fontSize: "14px", 
  fontWeight: "600" as const
};

export const chartLabelStyle = { 
  color: "var(--muted-foreground)", 
  marginBottom: "4px" 
};

interface ChartContainerProps {
  children: ReactNode;
  height?: number | string;
}

export default function ChartContainer({ children, height = 400 }: ChartContainerProps) {
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
