"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  appendHold,
  clearHandoff,
  coverProgress,
  foldOffset,
  handoffPause,
  holdLayer,
  pullHandoff,
  sectionGap,
  shiftHandoff,
  viewportHeight,
} from "@/components/site/handoff";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const pinPriority: Record<string, number> = {
  services: -2,
  work: -3,
};

export function SectionReveal({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      const motion = "(prefers-reduced-motion: no-preference)";

      const mount = (wideLandscape: boolean) => {
        const body = rootRef.current;
        const section = body?.closest("section");

        if (!body || !section) {
          return;
        }

        const enterTogether = wideLandscape && section.id === "work";
        const clip = () => section.classList.add("is-reveal-clip");
        const unclip = () => section.classList.remove("is-reveal-clip");
        const rowExtra = () =>
          stickAfterReveal
            ? Math.max(0, section.offsetHeight - viewportHeight())
            : 0;
        const coverAt = (extra: number) => {
          if (!enterTogether) {
            return coverProgress(extra);
          }

          const height = viewportHeight();
          const total = height + extra;

          return (extra + height * handoffPause) / total;
        };
        const syncLayer = (progress: number, active: boolean) => {
          holdLayer(section, active && progress < coverAt(rowExtra()));
        };
        const holdAtTop = () => {
          section.style.top = "0px";
        };
        const releaseTop = () => {
          section.style.removeProperty("top");
        };

        clip();
        section.classList.add("has-section-reveal");
        section.style.top = "0px";

        const stickAfterReveal = section.id === "work";
        const handoff = section.id === "services";
        const nextSection = section.nextElementSibling;
        const hold = { offset: 0 };
        const shiftNext = () => {
          if (!(nextSection instanceof HTMLElement)) {
            return;
          }

          shiftHandoff(nextSection, hold.offset);
        };
        const placeNext = () => {
          if (!(nextSection instanceof HTMLElement)) {
            return;
          }

          const distance = stickAfterReveal
            ? section.offsetHeight
            : viewportHeight();

          pullHandoff(nextSection, distance + sectionGap(section), hold.offset);

          if (stickAfterReveal) {
            nextSection.style.minHeight = `${section.offsetHeight}px`;
          }
        };

        if (handoff || stickAfterReveal) {
          placeNext();
        }

        const clearWorkShift = () => {
          if (section.style.position !== "relative") {
            return;
          }

          section.style.removeProperty("position");
          section.style.top = "0px";
        };

        const shiftWorkIntoFlow = () => {
          const shifted = Number(gsap.getProperty(section, "y")) || 0;
          gsap.set(section, { y: 0 });
          section.style.position = "relative";
          section.style.top = `${shifted}px`;
        };

        if (stickAfterReveal) {
          ScrollTrigger.addEventListener("refreshInit", clearWorkShift);
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => {
              if (handoff) {
                return `+=${viewportHeight() * 2}`;
              }

              if (!stickAfterReveal) {
                return `+=${viewportHeight()}`;
              }

              const extra = rowExtra();
              const height = viewportHeight();
              const lead = enterTogether ? 0 : height;
              return `+=${lead + height + extra}`;
            },
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: pinPriority[section.id] ?? -2,
            onUpdate: (self) => {
              syncLayer(self.progress, self.isActive);
            },
            onToggle: (self) => {
              if (self.isActive) {
                if (stickAfterReveal) {
                  clearWorkShift();
                }
                section.classList.add("is-reveal-pin");
                holdAtTop();
                syncLayer(self.progress, true);
                clip();
                return;
              }

              section.classList.remove("is-reveal-pin");
              releaseTop();
              holdLayer(section, false);
              if (self.progress > 0) {
                unclip();
              }
              if (stickAfterReveal && self.progress === 1) {
                shiftWorkIntoFlow();
              }
            },
            onRefresh(self) {
              syncLayer(self.progress, self.isActive);
              if (handoff || stickAfterReveal) {
                placeNext();
              }
              if (stickAfterReveal && !self.isActive && self.progress === 1) {
                shiftWorkIntoFlow();
              }
            },
          },
        });

        if (!enterTogether) {
          timeline.from(
            body,
            {
              y: () => foldOffset(body, section),
              duration: 0.65,
              ease: "none",
            },
            0.35,
          );
        }

        const holdThenCover = (at: number | string) => {
          appendHold(timeline, hold, shiftNext, at);
        };

        if (handoff) {
          holdThenCover(1);
        }

        if (stickAfterReveal) {
          const rowUnits = () => rowExtra() / viewportHeight();

          timeline.to(
            body,
            {
              y: () => -rowExtra(),
              duration: rowUnits(),
              ease: "none",
            },
            enterTogether ? 0 : 1,
          );
          holdThenCover(">");
        }

        return () => {
          unclip();
          releaseTop();
          holdLayer(section, false);
          clearWorkShift();
          section.classList.remove("has-section-reveal", "is-reveal-pin");
          if (nextSection instanceof HTMLElement && (handoff || stickAfterReveal)) {
            nextSection.style.minHeight = "";
            clearHandoff(nextSection);
          }
          if (stickAfterReveal) {
            ScrollTrigger.removeEventListener("refreshInit", clearWorkShift);
          }
        };
      };

      media.add(`${motion} and (max-width: 1023px)`, () => mount(false));
      media.add(
        `${motion} and (min-width: 1024px) and (orientation: portrait)`,
        () => mount(false),
      );
      media.add(
        `${motion} and (min-width: 1024px) and (orientation: landscape)`,
        () => mount(true),
      );

      return () => media.revert();
    },
    { scope: rootRef },
  );

  return (
    <div className="section-reveal" ref={rootRef}>
      {children}
    </div>
  );
}
