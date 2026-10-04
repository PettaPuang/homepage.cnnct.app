export const siteContent = {
  descriptor: "DIGITAL ERP STUDIO",
  hero: ["SYSTEMS", "THAT MOVE", "BUSINESS"],
  scrollHero: ["connect", "and control", "business"],
  introduction: [
    "An ERP built for a single business,",
    "following the workflow already in place.",
  ],
  introductionId: [
    "ERP yang dibangun untuk satu bisnis,",
    "mengikuti alur kerja yang sudah berjalan.",
  ],
  email: "admin@cnnct.app",
  instagram: "cnnct.app",
  services: [
    {
      index: "01",
      title: "Dedicated ERP",
      description: "Prepared in your business's own name.",
      descriptionId: "Disiapkan atas nama bisnis Anda.",
    },
    {
      index: "02",
      title: "Custom Operation",
      description: "Fully customized business-flow operations.",
      descriptionId: "Operasi alur bisnis yang disesuaikan sepenuhnya.",
    },
    {
      index: "03",
      title: "Business Compliance",
      description: "Business and accounting guidance, with priority support.",
      descriptionId:
        "Konsultasi bisnis dan akuntansi, dengan dukungan prioritas.",
    },
  ],
  work: [
    {
      name: "CONNECT",
      year: "2026",
      url: "https://connect.cnnct.app",
      label: "connect.cnnct.app",
      mark: "/work/connect.png",
      markOnDark: "/work/connect-on-dark.png",
      description: "General and simple ERP. POS and accounting.",
    },
    {
      name: "TAMA",
      year: "2025",
      url: "https://tamaindonesia.cnnct.app",
      label: "tamaindonesia.cnnct.app",
      mark: "/work/tama.png",
      markTile: true,
      description:
        "Dedicated ERP for Tama Indonesia, a retail trading company. Business operations, inventory, accounting, and HRD.",
    },
    {
      name: "KAYUWA",
      year: "2025",
      url: "https://kayuwaindonesia.cnnct.app",
      label: "kayuwaindonesia.cnnct.app",
      mark: "/work/kayuwa.png",
      markOnDark: "/work/kayuwa-on-dark.png",
      description:
        "Dedicated ERP for Kayuwa Indonesia, a laser-cutting manufacturer. Management, manufacturing workflow, inventory, invoicing, delivery, WhatsApp notifications, customers, accounting, and financial statements.",
    },
    {
      name: "NOZZL",
      year: "2025",
      url: "https://nozzl.id",
      label: "nozzl.id",
      mark: "/work/nozzl.png",
      description:
        "SPBU operations. Sales flow, purchasing, nozzle and fuel-tank control, and financial statements.",
    },
    {
      name: "JIYUU",
      year: "2026",
      url: "https://jiyuucoffee.cnnct.app",
      label: "jiyuucoffee.cnnct.app",
      mark: "/work/jiyuu.png",
      description:
        "Dedicated ERP for Jiyuu Coffee, a cafe and F&B business. POS, inventory, cost and recipes, shifts, multiple locations, accounting, and financial statements.",
    },
    {
      name: "BACKSTAGE",
      year: "2026",
      url: "https://backstage.cnnct.app",
      label: "backstage.cnnct.app",
      description:
        "Dedicated ERP for Backstage Roastery, a coffee roasting business. Roastery process, recipes and bill of materials, inventory, sales and payments, purchasing, assets, expenses, and accounting.",
    },
    {
      name: "ADM",
      year: "2026",
      url: "https://azkadermawanmotor.cnnct.app",
      label: "azkadermawanmotor.cnnct.app",
      description:
        "Dedicated ERP for Azka Dermawan Motor, a business that buys and sells cars. Sales, inventory, purchasing, assets, and accounting, with inventory capitalization on stock.",
    },
    {
      name: "PRISMA",
      year: "2026",
      url: "https://prisma.cnnct.app",
      label: "prisma.cnnct.app",
      description:
        "Dedicated ERP for Prisma Interior, a construction and interior contractor. Project cost, budgeting, billing, and progress for each job, from the budget through the bill and the work completed.",
    },
  ],
} as const;

export const contactHref = `mailto:${siteContent.email}`;
export const instagramHref = `https://instagram.com/${siteContent.instagram}`;
