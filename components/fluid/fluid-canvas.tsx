"use client";

import { useEffect, useRef, useState } from "react";

export function FluidCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const capabilityQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 768px)",
    );
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (!container || !canvas) {
      return;
    }

    const canvasElement = canvas;
    let disposed = false;
    let importGeneration = 0;
    let importing = false;
    let sectionVisible = false;
    let engine: import("./fluid-engine").FluidEngine | null = null;

    const isEnabled = () =>
      capabilityQuery.matches && !reducedMotionQuery.matches;

    const isInsideContainer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };

    const removeBootstrapListener = () => {
      window.removeEventListener("pointermove", onFirstPointerMove);
    };

    const addBootstrapListener = () => {
      if (!disposed && isEnabled() && !engine && !importing) {
        window.addEventListener("pointermove", onFirstPointerMove, {
          passive: true,
        });
      }
    };

    async function startFromPointer(event: PointerEvent) {
      importing = true;
      removeBootstrapListener();
      const generation = ++importGeneration;

      try {
        const { FluidEngine } = await import("./fluid-engine");

        if (disposed || generation !== importGeneration || !isEnabled()) {
          return;
        }

        engine = new FluidEngine(canvasElement);
        engine.setVisible(sectionVisible);
        engine.setPointerBaseline(event.clientX, event.clientY);
        setActive(true);
      } catch {
        return;
      } finally {
        if (generation === importGeneration) {
          importing = false;

          if (!engine) {
            addBootstrapListener();
          }
        }
      }
    }

    function onFirstPointerMove(event: PointerEvent) {
      if (!isInsideContainer(event)) {
        return;
      }

      void startFromPointer(event);
    }

    const syncCapability = () => {
      if (isEnabled()) {
        addBootstrapListener();
        return;
      }

      importGeneration += 1;
      importing = false;
      removeBootstrapListener();
      engine?.dispose();
      engine = null;
      setActive(false);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        sectionVisible = entry.isIntersecting;
        engine?.setVisible(sectionVisible);
      },
      { threshold: 0.05 },
    );

    observer.observe(container);
    capabilityQuery.addEventListener("change", syncCapability);
    reducedMotionQuery.addEventListener("change", syncCapability);
    syncCapability();

    return () => {
      disposed = true;
      importGeneration += 1;
      removeBootstrapListener();
      capabilityQuery.removeEventListener("change", syncCapability);
      reducedMotionQuery.removeEventListener("change", syncCapability);
      observer.disconnect();
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
