"use client";

import { useState } from "react";

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

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
        <a href="#services" onClick={closeMenu}>
          Services
        </a>
        <a href="#work" onClick={closeMenu}>
          Work
        </a>
        <a href="#contact" onClick={closeMenu}>
          Email
        </a>
      </nav>
    </header>
  );
}
