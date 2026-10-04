import gsap from "gsap";

export const handoffPause = 0.4;

const pinLayer = "45";
const paintLayer = new WeakMap<HTMLElement, string>();

function sectionPaintLayer(section: HTMLElement) {
  const cached = paintLayer.get(section);
  if (cached) {
    return cached;
  }

  const inline = section.style.zIndex;
  if (inline === pinLayer) {
    section.style.zIndex = "";
  }

  const layer = getComputedStyle(section).zIndex;
  if (inline === pinLayer) {
    section.style.zIndex = inline;
  }

  const value = !layer || layer === "auto" ? "0" : layer;
  paintLayer.set(section, value);
  return value;
}

let cachedHeight = 0;
let cachedWidth = 0;

function measureViewport() {
  if (
    !cachedHeight ||
    window.innerWidth !== cachedWidth ||
    !window.matchMedia("(pointer: coarse)").matches
  ) {
    cachedWidth = window.innerWidth;
    cachedHeight = Math.max(1, Math.round(window.innerHeight));
  }
}

export function viewportHeight() {
  if (!cachedHeight) {
    measureViewport();
  }

  return cachedHeight;
}

export function syncViewportHeight() {
  measureViewport();
  document.documentElement.style.setProperty(
    "--viewport-height",
    `${cachedHeight}px`,
  );
}

export function sectionGap(section: Element) {
  const spacer = section.parentElement;
  const host = spacer?.classList.contains("pin-spacer") ? spacer : section;

  return Number.parseFloat(getComputedStyle(host).marginBottom) || 0;
}

export function foldOffset(element: HTMLElement, section: Element) {
  const currentY = Number(gsap.getProperty(element, "y")) || 0;
  const topInSection =
    element.getBoundingClientRect().top -
    currentY -
    section.getBoundingClientRect().top;

  return viewportHeight() - topInSection;
}

export function coverProgress(extra = 0) {
  const height = viewportHeight();
  const total = height * 2 + extra;

  return (height + extra + height * handoffPause) / total;
}

export function holdLayer(section: HTMLElement, above: boolean) {
  const spacer = section.parentElement;
  const nodes = [section];

  if (spacer?.classList.contains("pin-spacer") && spacer instanceof HTMLElement) {
    nodes.push(spacer);
  }

  for (const node of nodes) {
    if (above) {
      node.style.zIndex = pinLayer;
      continue;
    }

    node.style.removeProperty("z-index");
  }
}

type HoldTimeline = {
  to: (target: object, vars: object, position?: number | string) => HoldTimeline;
};

export function appendHold(
  timeline: HoldTimeline,
  hold: { offset: number },
  onUpdate: () => void,
  at: number | string,
) {
  timeline.to(
    hold,
    {
      offset: () => viewportHeight() * handoffPause,
      duration: handoffPause,
      ease: "none",
      onUpdate,
    },
    at,
  );
  timeline.to(
    hold,
    {
      offset: 0,
      duration: 1 - handoffPause,
      ease: "none",
      onUpdate,
    },
    ">",
  );
}

function handoffNode(section: HTMLElement) {
  const parent = section.parentElement;
  return parent?.classList.contains("pin-spacer") ? parent : section;
}

export function shiftHandoff(section: HTMLElement, offset: number) {
  const target = handoffNode(section);

  if (target !== section) {
    section.style.removeProperty("transform");
  }

  if (offset <= 0.5) {
    target.style.removeProperty("transform");
    if (target !== section && target.style.zIndex !== pinLayer) {
      target.style.removeProperty("z-index");
    }
    return;
  }

  target.style.transform = `translate3d(0px, ${offset}px, 0px)`;
  if (target !== section && target.style.zIndex !== pinLayer) {
    target.style.zIndex = sectionPaintLayer(section);
  }
}

export function pullHandoff(
  section: HTMLElement,
  pull: number,
  offset: number,
) {
  const target = handoffNode(section);

  target.style.marginTop = `${-pull}px`;
  if (target !== section) {
    section.style.marginTop = "0px";
  }

  shiftHandoff(section, offset);
}

export function clearHandoff(section: HTMLElement) {
  section.style.marginTop = "";
  section.style.removeProperty("transform");

  const parent = section.parentElement;
  if (!parent?.classList.contains("pin-spacer")) {
    return;
  }

  parent.style.marginTop = "";
  parent.style.removeProperty("transform");
  if (parent.style.zIndex !== pinLayer) {
    parent.style.removeProperty("z-index");
  }
}
