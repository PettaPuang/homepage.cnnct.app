"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const pinPriority: Record<string, number> = {
  services: -2,
  work: -3,
};

const handoffPause = 0.4;

export function SectionReveal({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const body = rootRef.current;
        const section = body?.closest("section");

        if (!body || !section) {
          return;
        }

        const clip = () => section.classList.add("is-reveal-clip");
        const unclip = () => section.classList.remove("is-reveal-clip");
        const holdAtTop = () => {
          section.style.top = "0px";
          section.style.zIndex = "8";
        };
        const releaseTop = () => {
          section.style.removeProperty("top");
          section.style.removeProperty("z-index");
        };

        clip();
        section.classList.add("has-section-reveal");
        section.style.top = "0px";

        const stickAfterReveal = section.id === "work";
        const handoff = section.id === "services";
        const nextSection = section.nextElementSibling;

        const coverNext = () => {
          if (!(nextSection instanceof HTMLElement)) {
            return;
          }

          const ownGap =
            Number.parseFloat(getComputedStyle(section).marginBottom) || 0;
          const spacer = section.parentElement;
          const spacerGap = spacer?.classList.contains("pin-spacer")
            ? Number.parseFloat(getComputedStyle(spacer).marginBottom) || 0
            : 0;

          const distance = stickAfterReveal
            ? section.offsetHeight
            : window.innerHeight;
          nextSection.style.marginTop = `${-(distance + (ownGap || spacerGap))}px`;

          if (stickAfterReveal) {
            nextSection.style.minHeight = `${section.offsetHeight}px`;
          }
        };

        if (handoff || stickAfterReveal) {
          coverNext();
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
                return "+=200%";
              }

              if (!stickAfterReveal) {
                return "+=100%";
              }

              const extra = Math.max(0, section.offsetHeight - window.innerHeight);
              return `+=${window.innerHeight * 2 + extra}`;
            },
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: pinPriority[section.id] ?? -2,
            onUpdate: (self) => {
              const spacer = section.parentElement;
              const setLayer = (zIndex: string) => {
                section.style.zIndex = zIndex;
                if (spacer?.classList.contains("pin-spacer")) {
                  spacer.style.zIndex = zIndex;
                }
              };

              if (handoff) {
                const coverAt = (1 + handoffPause) / 2;
                setLayer(self.progress < coverAt ? "8" : "2");
                return;
              }

              if (!stickAfterReveal) {
                return;
              }

              const extra = Math.max(0, section.offsetHeight - window.innerHeight);
              const total = window.innerHeight * 2 + extra;
              const coverAt =
                (window.innerHeight + extra + window.innerHeight * handoffPause) /
                total;
              setLayer(self.progress < coverAt ? "8" : "3");
            },
            onToggle: (self) => {
              if (self.isActive) {
                if (stickAfterReveal) {
                  clearWorkShift();
                }
                section.classList.add("is-reveal-pin");
                holdAtTop();
                clip();
                return;
              }

              section.classList.remove("is-reveal-pin");
              releaseTop();
              if (self.progress > 0) {
                unclip();
              }
              if (stickAfterReveal && self.progress === 1) {
                shiftWorkIntoFlow();
              }
            },
            onRefresh(self) {
              if (handoff || stickAfterReveal) {
                coverNext();
              }
              if (stickAfterReveal && !self.isActive && self.progress === 1) {
                shiftWorkIntoFlow();
              }
            },
          },
        });

        timeline.from(
          body,
          {
            y: () => {
              const currentY = Number(gsap.getProperty(body, "y")) || 0;
              const viewportHeight =
                window.visualViewport?.height ?? window.innerHeight;
              const topInSection =
                body.getBoundingClientRect().top -
                currentY -
                section.getBoundingClientRect().top;

              return viewportHeight - topInSection + 24;
            },
            duration: 0.65,
            ease: "none",
          },
          0.35,
        );

        const heldMargin = { offset: 0 };
        const applyNextHold = () => {
          if (!(nextSection instanceof HTMLElement)) {
            return;
          }

          const ownGap =
            Number.parseFloat(getComputedStyle(section).marginBottom) || 0;
          const spacer = section.parentElement;
          const spacerGap = spacer?.classList.contains("pin-spacer")
            ? Number.parseFloat(getComputedStyle(spacer).marginBottom) || 0
            : 0;
          const distance = stickAfterReveal
            ? section.offsetHeight
            : window.innerHeight;
          const pull = distance + (ownGap || spacerGap) - heldMargin.offset;
          const nextSpacer = nextSection.parentElement;
          const target = nextSpacer?.classList.contains("pin-spacer")
            ? nextSpacer
            : nextSection;
          target.style.marginTop = `${-pull}px`;
          if (target !== nextSection) {
            nextSection.style.marginTop = "0px";
          }
        };

        const holdThenCover = (at: number | string) => {
          timeline.to(
            heldMargin,
            {
              offset: () => window.innerHeight * handoffPause,
              duration: handoffPause,
              ease: "none",
              onUpdate: applyNextHold,
            },
            at,
          );
          timeline.to(
            heldMargin,
            {
              offset: 0,
              duration: 1 - handoffPause,
              ease: "none",
              onUpdate: applyNextHold,
            },
            ">",
          );
        };

        if (handoff) {
          holdThenCover(1);
        }

        if (stickAfterReveal) {
          const rowUnits = () => {
            const extra = Math.max(0, section.offsetHeight - window.innerHeight);
            return extra / window.innerHeight;
          };

          timeline.to(
            body,
            {
              y: () => -Math.max(0, section.offsetHeight - window.innerHeight),
              duration: rowUnits(),
              ease: "none",
            },
            1,
          );
          holdThenCover(">");
        }

        return () => {
          unclip();
          releaseTop();
          clearWorkShift();
          section.classList.remove("has-section-reveal", "is-reveal-pin");
          if (nextSection instanceof HTMLElement && (handoff || stickAfterReveal)) {
            nextSection.style.marginTop = "";
            nextSection.style.minHeight = "";
          }
          if (stickAfterReveal) {
            ScrollTrigger.removeEventListener("refreshInit", clearWorkShift);
          }
        };
      });

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
