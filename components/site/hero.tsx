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

          if (section.id === "work") {
            const title = section.querySelector<HTMLElement>("#work-title");
            const row = section.querySelector<HTMLElement>(".work-row");

            if (!split || !header || !title) {
              if (section.style.getPropertyValue("--work-align")) {
                section.style.removeProperty("--work-align");
                ScrollTrigger.refresh();
              }
            } else {
              const rowPad = row
                ? Number.parseFloat(window.getComputedStyle(row).paddingTop) || 0
                : 0;
              const align = Math.max(
                0,
                Math.round(title.offsetTop - rowPad),
              );
              const current = Number.parseFloat(
                section.style.getPropertyValue("--work-align"),
              );

              if (!Number.isFinite(current) || Math.abs(current - align) > 1) {
                section.style.setProperty("--work-align", `${align}px`);
                ScrollTrigger.refresh();
              }
            }
          }

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
      ScrollTrigger.addEventListener("refreshInit", syncViewportHeight);

      window.addEventListener("resize", scheduleSectionLayout);
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

        const title = hero?.querySelector<HTMLElement>(
          ".hero-transition-title",
        );
        const wipe = hero?.querySelector<HTMLElement>(".hero-transition-wipe");
        const titleBox = {
          offset: 0,
          offsetLeft: 0,
          height: 0,
          width: 0,
          heroHeight: 0,
          heroWidth: 0,
        };

        const measureTitle = () => {
          if (!hero || !title) {
            return;
          }

          const heroRect = hero.getBoundingClientRect();
          const titleRect = title.getBoundingClientRect();
          titleBox.offset = titleRect.top - heroRect.top;
          titleBox.offsetLeft = titleRect.left - heroRect.left;
          titleBox.height = titleRect.height;
          titleBox.width = titleRect.width;
          titleBox.heroHeight = heroRect.height;
          titleBox.heroWidth = heroRect.width;
        };

        const syncTitleToWipe = () => {
          if (!hero || !title || !wipe) {
            return;
          }

          const wipeScale = Number(
            gsap.getProperty(wipe, axis === "x" ? "scaleX" : "scaleY"),
          );
          const scale = Number.isFinite(wipeScale) ? wipeScale : 0;

          if (axis === "up") {
            const hiddenTop = gsap.utils.clamp(
              0,
              titleBox.height,
              titleBox.heroHeight -
                titleBox.offset -
                titleBox.heroHeight * scale,
            );

            title.style.clipPath = `inset(${hiddenTop}px 0px 0px 0px)`;
            return;
          }

          if (axis === "y") {
            const hiddenBottom = gsap.utils.clamp(
              0,
              titleBox.height,
              titleBox.height -
                (titleBox.heroHeight * scale - titleBox.offset),
            );

            title.style.clipPath = `inset(0px 0px ${hiddenBottom}px 0px)`;
            return;
          }

          const hiddenRight = gsap.utils.clamp(
            0,
            titleBox.width,
            titleBox.width -
              (titleBox.heroWidth * scale - titleBox.offsetLeft),
          );

          title.style.clipPath = `inset(0px ${hiddenRight}px 0px 0px)`;
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
            invalidateOnRefresh: true,
            refreshPriority: 0,
            onUpdate: (self) => {
              if (hero) {
                holdLayer(hero, self.isActive && self.progress < coverProgress());
              }
            },
            onRefresh: (self) => {
              measureTitle();
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

        scrollTimeline.set("#hero-title", { visibility: "hidden" }, 1);
        appendHold(scrollTimeline, hold, applyHeroHold, 1);

        measureTitle();
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

      const clearHeroScroll = () => {
        clearPostHero();
        rootRef.current
          ?.querySelector<HTMLElement>(".hero-transition-title")
          ?.style.removeProperty("clip-path");
      };

      media.add(
        "(prefers-reduced-motion: no-preference) and (max-width: 767px)",
        () => {
          createScrollTimeline("up");
          return clearHeroScroll;
        },
      );

      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px) and (orientation: landscape)",
        () => {
          createScrollTimeline("x");
          return clearHeroScroll;
        },
      );

      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px) and (orientation: portrait)",
        () => {
          createScrollTimeline("y");
          return clearHeroScroll;
        },
      );

      return () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(layoutFrame);
        window.clearTimeout(layoutTimer);
        window.removeEventListener("resize", scheduleSectionLayout);
        ScrollTrigger.removeEventListener("refreshInit", syncViewportHeight);
        stackedSections.forEach((section) =>
          section.style.removeProperty("--stack-top"),
        );
        ruledSections.forEach((section) => {
          section.classList.remove("is-scroll-section");
          section.style.removeProperty("--work-align");
        });
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

          <h2 className="hero-title hero-transition-title" aria-hidden="true">
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
