"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { FluidCanvas } from "@/components/fluid/fluid-canvas";
import {
  appendHold,
  clearHandoff,
  coverProgress,
  holdLayer,
  pullHandoff,
  shiftHandoff,
  syncViewportHeight,
  viewportHeight,
} from "@/components/site/handoff";
import { siteContent } from "@/content/site";

gsap.registerPlugin(useGSAP, ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;

    window.history.scrollRestoration = "manual";

    if (navigation?.type !== "reload") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      const postHero = rootRef.current?.nextElementSibling;
      const stackedSections = Array.from(
        document.querySelectorAll<HTMLElement>(".stack-section"),
      );
      const ruledSections = Array.from(
        document.querySelectorAll<HTMLElement>(".ruled-section"),
      );

      const getSectionViewportHeight = (section: HTMLElement) => {
        const minHeight = Number.parseFloat(
          window.getComputedStyle(section).minHeight,
        );

        return Number.isFinite(minHeight) ? minHeight : viewportHeight();
      };

      const updateSectionLayout = () => {
        ruledSections.forEach((section) => {
          const header =
            section.querySelector<HTMLElement>(".section-heading");
          const content = section.querySelector<HTMLElement>(
            ".service-grid, .work-list",
          );

          if (!header || !content) {
            return;
          }

          const split =
            section.id === "work" &&
            window.matchMedia(
              "(min-width: 1024px) and (orientation: landscape)",
            ).matches;
          const reveal = content.closest(".section-reveal");
          const contentHeight =
            reveal instanceof HTMLElement
              ? reveal.offsetHeight
              : content.offsetHeight;
          const occupied = split
            ? Math.max(header.offsetHeight, contentHeight)
            : header.offsetHeight + contentHeight;

          section.classList.toggle(
            "is-scroll-section",
            occupied > getSectionViewportHeight(section),
          );
        });

        stackedSections.forEach((section) => {
          const top = Math.min(
            0,
            getSectionViewportHeight(section) - section.offsetHeight,
          );
          section.style.setProperty("--stack-top", `${top}px`);
        });
      };

      let layoutFrame = 0;
      let layoutTimer: number | undefined;

      const scheduleSectionLayout = () => {
        window.cancelAnimationFrame(layoutFrame);
        window.clearTimeout(layoutTimer);

        layoutFrame = window.requestAnimationFrame(updateSectionLayout);
        layoutTimer = window.setTimeout(updateSectionLayout, 150);
      };

      const resizeObserver = new ResizeObserver(scheduleSectionLayout);
      stackedSections.forEach((section) => resizeObserver.observe(section));
      ruledSections.forEach((section) => {
        const header =
          section.querySelector<HTMLElement>(".section-heading");
        const content = section.querySelector<HTMLElement>(
          ".service-grid, .work-list",
        );

        if (header) {
          resizeObserver.observe(header);
        }

        if (content) {
          resizeObserver.observe(content);
        }
      });
      syncViewportHeight();
      let appliedHeight = viewportHeight();
      let viewportTimer: number | undefined;

      const settleViewport = () => {
        const next = viewportHeight();
        if (next === appliedHeight) {
          return;
        }

        appliedHeight = next;
        syncViewportHeight();
        ScrollTrigger.refresh();
      };

      const scheduleViewport = () => {
        window.clearTimeout(viewportTimer);
        viewportTimer = window.setTimeout(settleViewport, 150);
      };

      window.addEventListener("resize", scheduleSectionLayout);
      window.addEventListener("resize", scheduleViewport);
      window.visualViewport?.addEventListener(
        "resize",
        scheduleSectionLayout,
      );
      window.visualViewport?.addEventListener("resize", scheduleViewport);
      updateSectionLayout();
      scheduleSectionLayout();

      const createScrollTimeline = (axis: "x" | "y" | "up") => {
        const hero = rootRef.current;
        const fromBottom = axis === "up";

        const hold = { offset: 0 };
        const placePostHero = () => {
          if (!(postHero instanceof HTMLElement)) {
            return;
          }

          pullHandoff(postHero, viewportHeight(), hold.offset);
        };
        const applyHeroHold = () => {
          if (!(postHero instanceof HTMLElement)) {
            return;
          }

          shiftHandoff(postHero, hold.offset);
        };

        placePostHero();

        const syncTitleToWipe = () => {
          if (!fromBottom || !hero) {
            return;
          }

          const title = hero.querySelector<HTMLElement>(
            ".hero-transition-title",
          );
          const wipe = hero.querySelector<HTMLElement>(
            ".hero-transition-wipe",
          );

          if (!title || !wipe) {
            return;
          }

          const heroRect = hero.getBoundingClientRect();
          const titleRect = title.getBoundingClientRect();
          const scaleY = Number(gsap.getProperty(wipe, "scaleY"));
          const scale = Number.isFinite(scaleY) ? scaleY : 0;
          const edgeY = heroRect.bottom - heroRect.height * scale;
          const hiddenTop = gsap.utils.clamp(
            0,
            titleRect.height,
            edgeY - titleRect.top,
          );

          title.style.clipPath = `inset(${hiddenTop}px 0px 0px 0px)`;
        };

        if (fromBottom) {
          gsap.set(".hero-transition-wipe", {
            scaleX: 1,
            scaleY: 0,
            transformOrigin: "center bottom",
          });
        }

        const scrollTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => `+=${viewportHeight() * 2}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 0,
            onUpdate: (self) => {
              if (hero) {
                holdLayer(hero, self.isActive && self.progress < coverProgress());
              }
            },
            onRefresh: (self) => {
              syncTitleToWipe();
              placePostHero();
              if (hero) {
                holdLayer(hero, self.isActive && self.progress < coverProgress());
              }
            },
          },
        });

        const wipeProperties = axis === "x" ? { scaleX: 1 } : { scaleY: 1 };

        scrollTimeline.to(
          ".hero-transition-wipe",
          {
            ...wipeProperties,
            duration: 1,
            ease: "none",
            onUpdate: syncTitleToWipe,
          },
          0,
        );

        if (!fromBottom) {
          scrollTimeline.to(
            ".hero-transition-title",
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1,
              ease: "none",
            },
            0,
          );
        }

        scrollTimeline.set("#hero-title", { visibility: "hidden" }, 1);
        appendHold(scrollTimeline, hold, applyHeroHold, 1);

        syncTitleToWipe();
      };

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { ease: "power4.out" },
        });

        timeline
          .from(
            ".hero-kicker",
            {
              autoAlpha: 0,
              y: 18,
              duration: 0.6,
            },
            0.1,
          )
          .from(
            "#hero-title .hero-line-copy",
            {
              yPercent: 115,
              duration: 1.05,
              stagger: 0.1,
            },
            0.12,
          )
          .from(
            ".hero-footer",
            {
              autoAlpha: 0,
              y: 18,
              duration: 0.65,
            },
            0.48,
          );
      });

      const clearPostHero = () => {
        if (!(postHero instanceof HTMLElement)) {
          return;
        }

        clearHandoff(postHero);
      };

      media.add(
        "(prefers-reduced-motion: no-preference) and (max-width: 767px)",
        () => {
          createScrollTimeline("up");

          return () => {
            clearPostHero();
            rootRef.current
              ?.querySelector<HTMLElement>(".hero-transition-title")
              ?.style.removeProperty("clip-path");
          };
        },
      );

      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px) and (orientation: landscape)",
        () => {
          createScrollTimeline("x");
          return clearPostHero;
        },
      );

      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px) and (orientation: portrait)",
        () => {
          createScrollTimeline("y");
          return clearPostHero;
        },
      );

      return () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(layoutFrame);
        window.clearTimeout(layoutTimer);
        window.clearTimeout(viewportTimer);
        window.removeEventListener("resize", scheduleSectionLayout);
        window.removeEventListener("resize", scheduleViewport);
        window.visualViewport?.removeEventListener(
          "resize",
          scheduleSectionLayout,
        );
        window.visualViewport?.removeEventListener("resize", scheduleViewport);
        stackedSections.forEach((section) =>
          section.style.removeProperty("--stack-top"),
        );
        ruledSections.forEach((section) =>
          section.classList.remove("is-scroll-section"),
        );
        media.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="hero-kicker">{siteContent.descriptor}</p>
        <div className="hero-title-stack">
          <h1 id="hero-title" className="hero-title">
            {siteContent.hero.map((line) => (
              <span className="hero-line" key={line}>
                <span className="hero-line-copy">{line}</span>
              </span>
            ))}
          </h1>

          <h2 className="hero-title hero-transition-title">
            {siteContent.scrollHero.map((line) => (
              <span className="hero-line" key={line}>
                <span className="hero-line-copy">{line}</span>
              </span>
            ))}
          </h2>
        </div>
      </div>

      <footer className="hero-footer">
        <span>EST. 2026</span>
        <span>MOVE TO EXPLORE</span>
      </footer>

      <FluidCanvas />
      <div className="hero-transition-wipe" aria-hidden="true" />
    </section>
  );
}
