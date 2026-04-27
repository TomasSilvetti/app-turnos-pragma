"use client";

interface ShapeGridProps {
  className?: string;
  lineColor?: string;
  cellSize?: number;
}

export default function ShapeGrid({
  className = "",
  lineColor = "rgba(148, 172, 209, 0.35)",
  cellSize = 40,
}: ShapeGridProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(${lineColor} 1px, transparent 1px),
          linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        backgroundColor: "#ffffff",
      }}
    />
  );
}
