export const siteContent = {
  descriptor: "DIGITAL ERP STUDIO",
  hero: ["SYSTEMS", "THAT MOVE", "BUSINESS"],
  scrollHero: ["connect", "and control", "business"],
  introduction: [
    "A minimal framework for presenting digital ERP products,",
    "control every business flow from one platform.",
  ],
  introductionId: [
    "Kerangka sederhana untuk menampilkan produk ERP digital,",
    "kendalikan setiap alur bisnis dari satu platform.",
  ],
  email: "admin@cnnct.app",
  instagram: "cnnct.app",
  services: [
    {
      index: "01",
      title: "Dedicated SaaS ERP",
      description: "An ERP built specifically for your own business.",
      descriptionId: "ERP yang dibangun khusus untuk bisnis Anda.",
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
      description: "General and simple ERP. POS and accounting.",
    },
    {
      name: "TAMA",
      year: "2025",
      url: "https://tamaindonesia.cnnct.app",
      label: "tamaindonesia.cnnct.app",
      description:
        "Dedicated ERP for Tama Indonesia, a retail trading company. Business operations, inventory, accounting, and HRD.",
    },
    {
      name: "KAYUWA",
      year: "2025",
      url: "https://kayuwaindonesia.cnnct.app",
      label: "kayuwaindonesia.cnnct.app",
      description:
        "Dedicated ERP for Kayuwa Indonesia, a laser-cutting manufacturer. Management, manufacturing workflow, inventory, invoicing, delivery, WhatsApp notifications, customers, accounting, and financial statements.",
    },
    {
      name: "NOZZL",
      year: "2025",
      url: "https://nozzl.id",
      label: "nozzl.id",
      description:
        "SPBU operations. Sales flow, purchasing, nozzle and fuel-tank control, and financial statements.",
    },
    {
      name: "JIYUU",
      year: "2026",
      url: "https://jiyuucoffee.cnnct.app",
      label: "jiyuucoffee.cnnct.app",
      description:
        "Dedicated ERP for Jiyuu Coffee, a cafe and F&B business. POS, inventory, cost and recipes, shifts, multiple locations, accounting, and financial statements.",
    },
  ],
} as const;

export const contactHref = `mailto:${siteContent.email}`;
export const instagramHref = `https://instagram.com/${siteContent.instagram}`;
