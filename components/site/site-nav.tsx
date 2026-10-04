"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { viewportHeight } from "@/components/site/handoff";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const links = [
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

function scrollTarget(id: string) {
  const section = document.getElementById(id);
  if (!section) {
    return null;
  }

  const pinned = ScrollTrigger.getAll().find(
    (item) => item.trigger === section && item.pin,
  );

  if (pinned) {
    return pinned.start + viewportHeight();
  }

  const work = document.getElementById("work");
  const previous = ScrollTrigger.getAll().find(
    (item) => item.trigger === work && item.pin,
  );

  return previous ? previous.end : null;
}

function scrollPage(top: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top, behavior: "instant" });
    return;
  }

  gsap.to(window, {
    scrollTo: top,
    duration: 1,
    ease: "power2.inOut",
    overwrite: true,
  });
}

function openSection(id: string) {
  const top = scrollTarget(id);
  if (top == null) {
    return;
  }

  window.history.pushState(null, "", `#${id}`);
  scrollPage(top);
}

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!links.some((link) => link.id === id)) {
      return;
    }

    let landed = false;

    const go = () => {
      if (landed) {
        return;
      }

      const top = scrollTarget(id);
      if (top == null) {
        return;
      }

      landed = true;
      window.scrollTo({ top, behavior: "instant" });
      ScrollTrigger.removeEventListener("refresh", go);
    };

    ScrollTrigger.addEventListener("refresh", go);
    go();

    return () => ScrollTrigger.removeEventListener("refresh", go);
  }, []);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const hit = document.elementFromPoint(window.innerWidth / 2, height * 0.22);
      const id = hit?.closest("section")?.id;
      const next = links.some((link) => link.id === id) ? id ?? null : null;

      setCurrent((active) => (active === next ? active : next));
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href="#"]');
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      window.history.pushState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      scrollPage(0);
    };

    document.addEventListener("click", onClick);

    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header className={`site-nav${isOpen ? " is-open" : ""}`}>
      <button
        className="site-nav-toggle"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        Menu
      </button>

      <nav id="primary-navigation" aria-label="Primary navigation">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            aria-current={current === link.id ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              closeMenu();
              openSection(link.id);
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
