/** Gaya bersama Recharts. Memakai variabel CSS tema agar mengikuti light/dark mode. */
export const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 12 } as const;
export const GRID_STROKE = "hsl(var(--border))";
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--popover-foreground))", fontWeight: 600 },
  itemStyle: { color: "hsl(var(--popover-foreground))" },
  cursor: { fill: "hsl(var(--muted) / 0.5)" },
} as const;
