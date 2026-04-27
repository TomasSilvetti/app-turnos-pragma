"use client";

import { useEffect, useRef } from "react";

interface PlasmaProps {
  speed?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function Plasma({
  speed = 0.5,
  color1 = "#0a1628",
  color2 = "#0d1f3c",
  color3 = "#1a3a6b",
  color4 = "#0f2a50",
  className = "",
}: PlasmaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const safeCtx = ctx;

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const c3 = hexToRgb(color3);
    const c4 = hexToRgb(color4);

    // Work at a fixed low resolution, CSS stretches it
    const W = 128;
    const H = 128;
    canvas.width = W;
    canvas.height = H;

    const buf = new Uint8ClampedArray(W * H * 4);

    function draw(timestamp: number) {
      const t = timestamp * 0.001 * speed;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const nx = x / W;
          const ny = y / H;

          const v =
            Math.sin(nx * 6 + t) +
            Math.sin(ny * 4 + t * 0.7) +
            Math.sin((nx + ny) * 5 + t * 1.1) +
            Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 8 + t * 0.9);

          // Normalize to [0, 1]
          const n = (v + 4) / 8;

          let r: number, g: number, b: number;

          if (n < 0.33) {
            const tt = n / 0.33;
            r = lerp(c1[0], c2[0], tt);
            g = lerp(c1[1], c2[1], tt);
            b = lerp(c1[2], c2[2], tt);
          } else if (n < 0.66) {
            const tt = (n - 0.33) / 0.33;
            r = lerp(c2[0], c3[0], tt);
            g = lerp(c2[1], c3[1], tt);
            b = lerp(c2[2], c3[2], tt);
          } else {
            const tt = (n - 0.66) / 0.34;
            r = lerp(c3[0], c4[0], tt);
            g = lerp(c3[1], c4[1], tt);
            b = lerp(c3[2], c4[2], tt);
          }

          const i = (y * W + x) * 4;
          buf[i] = r;
          buf[i + 1] = g;
          buf[i + 2] = b;
          buf[i + 3] = 255;
        }
      }

      safeCtx.putImageData(new ImageData(buf, W, H), 0, 0);
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [speed, color1, color2, color3, color4]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ imageRendering: "auto", willChange: "transform" }}
    />
  );
}
