"use client";

import { useState } from "react";

import { siteContent } from "@/content/site";
import { StatementLine } from "@/components/site/statement-line";

export function StatementCopy() {
  const [language, setLanguage] = useState<"en" | "id">("en");
  const lines =
    language === "en" ? siteContent.introduction : siteContent.introductionId;

  const toggleLanguage = () => {
    setLanguage((current) => (current === "en" ? "id" : "en"));
  };

  return (
    <button
      className="statement-copy"
      type="button"
      lang={language}
      onClick={toggleLanguage}
    >
      <span>{lines[0]}</span>
      <StatementLine text={lines[1]} />
    </button>
  );
}
