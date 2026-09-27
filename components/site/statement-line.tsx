"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const handoffPause = 0.4;

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

        const coverWithServices = () => {
          if (!(services instanceof HTMLElement)) {
            return;
          }

          const ownGap =
            Number.parseFloat(getComputedStyle(statement).marginBottom) || 0;
          const spacer = statement.parentElement;
          const spacerGap =
            spacer?.classList.contains("pin-spacer")
              ? Number.parseFloat(getComputedStyle(spacer).marginBottom) || 0
              : 0;
          services.style.marginTop = `${-(window.innerHeight + (ownGap || spacerGap))}px`;
        };

        coverWithServices();

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: statement,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
            onRefresh: coverWithServices,
          },
        });

        timeline.from(
          copy,
          {
            y: () => {
              const currentY = Number(gsap.getProperty(copy, "y")) || 0;
              const viewportHeight =
                window.visualViewport?.height ?? window.innerHeight;
              const topInSection =
                copy.getBoundingClientRect().top -
                currentY -
                statement.getBoundingClientRect().top;

              return viewportHeight - topInSection + 24;
            },
            duration: 0.65,
            ease: "none",
          },
          0.35,
        );
        const heldMargin = { offset: 0 };
        const applyServicesHold = () => {
          if (!(services instanceof HTMLElement)) {
            return;
          }

          const ownGap =
            Number.parseFloat(getComputedStyle(statement).marginBottom) || 0;
          const spacer = statement.parentElement;
          const spacerGap = spacer?.classList.contains("pin-spacer")
            ? Number.parseFloat(getComputedStyle(spacer).marginBottom) || 0
            : 0;
          const pull = window.innerHeight + (ownGap || spacerGap) - heldMargin.offset;
          const servicesSpacer = services.parentElement;
          const target =
            servicesSpacer?.classList.contains("pin-spacer")
              ? servicesSpacer
              : services;
          target.style.marginTop = `${-pull}px`;
          if (target !== services) {
            services.style.marginTop = "0px";
          }
        };

        timeline.to(
          heldMargin,
          {
            offset: () => window.innerHeight * handoffPause,
            duration: handoffPause,
            ease: "none",
            onUpdate: applyServicesHold,
          },
          1,
        );
        timeline.to(
          heldMargin,
          {
            offset: 0,
            duration: 1 - handoffPause,
            ease: "none",
            onUpdate: applyServicesHold,
          },
          ">",
        );

        return () => {
          if (services instanceof HTMLElement) {
            services.style.marginTop = "";
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
