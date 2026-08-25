import { type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

export const chartColors = [
  "#5266eb", // wine (accent)
  "#8f9cf5", // cyan
  "#3a4bc4", // violet
  "#a9b3f8", // rose
  "#12B76A", // emerald
  "#70707d", // amber
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
