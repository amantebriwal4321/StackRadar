import { type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

export const chartColors = [
  "#8052ff", // Electric Iris
  "#a488ff", // Iris light
  "#6a3fd6", // Iris deep
  "#c9b8ff", // Iris pale
  "#bdbdbd", // Silver Mist
  "#9a9a9a", // Ash Gray
];

export const chartTooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--foreground)",
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
