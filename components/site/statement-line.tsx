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
  holdLayer,
  pullHandoff,
  sectionGap,
  shiftHandoff,
  viewportHeight,
} from "@/components/site/handoff";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function StatementLine({ text }: { text: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const statement = rootRef.current?.closest(".statement");

        if (!statement) {
          return;
        }

        const copy = rootRef.current?.querySelector<HTMLElement>(
          ".statement-late-copy",
        );

        if (!copy) {
          return;
        }

        const services = statement.nextElementSibling;
        const hold = { offset: 0 };
        const shiftServices = () => {
          if (!(services instanceof HTMLElement)) {
            return;
          }

          shiftHandoff(services, hold.offset);
        };
        const placeServices = () => {
          if (!(services instanceof HTMLElement)) {
            return;
          }

          pullHandoff(
            services,
            viewportHeight() + sectionGap(statement),
            hold.offset,
          );
        };

        placeServices();

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: statement,
            start: "top top",
            end: () => `+=${viewportHeight() * 2}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
            onUpdate: (self) => {
              if (statement instanceof HTMLElement) {
                holdLayer(
                  statement,
                  self.isActive && self.progress < coverProgress(),
                );
              }
            },
            onRefresh: (self) => {
              placeServices();
              if (statement instanceof HTMLElement) {
                holdLayer(
                  statement,
                  self.isActive && self.progress < coverProgress(),
                );
              }
            },
          },
        });

        timeline.from(
          copy,
          {
            y: () => foldOffset(copy, statement),
            duration: 0.65,
            ease: "none",
          },
          0.35,
        );
        appendHold(timeline, hold, shiftServices, 1);

        return () => {
          if (services instanceof HTMLElement) {
            clearHandoff(services);
          }
        };
      });

      return () => media.revert();
    },
    { scope: rootRef },
  );

  return (
    <span className="statement-late" ref={rootRef}>
      <span className="statement-late-copy">{text}</span>
    </span>
  );
}
