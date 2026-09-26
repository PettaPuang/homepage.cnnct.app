"use client";

import { useEffect, useRef, useState } from "react";

export function FluidCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const supportsPointer = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 768px)",
    ).matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!container || !canvas || !supportsPointer || reduceMotion) {
      return;
    }

    const canvasElement = canvas;
    const containerElement = container;
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let engine: import("./fluid-engine").FluidEngine | null = null;

    async function start() {
      try {
        const { FluidEngine } = await import("./fluid-engine");

        if (cancelled) {
          return;
        }

        engine = new FluidEngine(canvasElement);
        setActive(true);

        observer = new IntersectionObserver(
          ([entry]) => engine?.setVisible(entry.isIntersecting),
          { threshold: 0.05 },
        );
        observer.observe(containerElement);
      } catch {
        return;
      }
    }

    void start();

    return () => {
      cancelled = true;
      observer?.disconnect();
      engine?.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fluid-layer"
      data-mode={active ? "active" : undefined}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="fluid-canvas" />
    </div>
  );
}
