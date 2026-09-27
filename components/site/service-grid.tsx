"use client";

import { useState } from "react";

import { siteContent } from "@/content/site";

export function ServiceGrid() {
  const [language, setLanguage] = useState<"en" | "id">("en");

  const toggleLanguage = () => {
    setLanguage((current) => (current === "en" ? "id" : "en"));
  };

  return (
    <div className="service-grid">
      {siteContent.services.map((service) => (
        <article className="service-card" key={service.index}>
          <p className="item-index">{service.index}</p>
          <h3>{service.title}</h3>
          <button
            className="service-description"
            type="button"
            lang={language}
            onClick={toggleLanguage}
          >
            {language === "en" ? service.description : service.descriptionId}
          </button>
        </article>
      ))}
    </div>
  );
}
