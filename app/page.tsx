import Image from "next/image";
import { Hero } from "@/components/site/hero";
import { SectionReveal } from "@/components/site/section-reveal";
import { ServiceGrid } from "@/components/site/service-grid";
import { StatementCopy } from "@/components/site/statement-copy";
import { contactHref, instagramHref, siteContent } from "@/content/site";

export default function Home() {
  return (
    <main>
      <Hero />

      <div className="post-hero">
        <section
          id="about"
          className="statement section-shell stack-section"
          aria-labelledby="statement"
        >
        <p className="section-label">ABOUT</p>
        <h2 id="statement">
          <StatementCopy />
        </h2>
      </section>

      <section
        id="services"
        className="section-shell ruled-section stack-section"
        aria-labelledby="services-title"
      >
        <div className="section-heading">
          <p className="section-label">WHAT WE DO</p>
          <h2 id="services-title">Services</h2>
        </div>

        <SectionReveal>
          <ServiceGrid />
        </SectionReveal>
      </section>

      <section
        id="work"
        className="section-shell ruled-section stack-section"
        aria-labelledby="work-title"
      >
        <div className="section-heading">
          <p className="section-label">SELECTED SYSTEMS</p>
          <h2 id="work-title">Work</h2>
        </div>

        <SectionReveal>
          <div className="work-list">
          {siteContent.work.map((project, index) => {
            const mark = "mark" in project ? project.mark : null;
            const markOnDark =
              "markOnDark" in project ? project.markOnDark : null;
            const markTile = "markTile" in project && project.markTile;

            return (
              <article className="work-row" key={project.name}>
                <span className="item-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>
                  {mark ? (
                    <span
                      className={
                        markTile
                          ? "work-mark work-mark-tile"
                          : markOnDark
                            ? "work-mark work-mark-pair"
                            : "work-mark"
                      }
                    >
                      <Image
                      className="work-mark-on-light"
                      src={mark}
                      alt=""
                      fill
                      sizes="4rem"
                    />
                    {markOnDark ? (
                      <Image
                        className="work-mark-on-dark"
                        src={markOnDark}
                        alt=""
                        fill
                        sizes="4rem"
                      />
                    ) : null}
                    </span>
                  ) : null}
                  {project.name}
                </h3>
                <p className="work-summary">{project.description}</p>
                <a
                  className="work-link"
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.label}
                </a>
                <time>{project.year}</time>
              </article>
            );
          })}
        </div>
        </SectionReveal>
      </section>

      <section
        id="contact"
        className="contact-section"
        aria-labelledby="contact-title"
      >
        <div className="contact-pin">
          <h2 id="contact-title">Have a system in mind?</h2>
          <a className="contact-link" href={contactHref}>
            <span>
              <span className="contact-kind">Email</span>
              {siteContent.email}
            </span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            className="contact-link"
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <span className="contact-kind">Instagram</span>
              {siteContent.instagram}
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <footer className="site-footer">
        <p>© 2026 CNNCT.APP</p>
        <a href="#">BACK TO TOP</a>
      </footer>
      </div>
    </main>
  );
}
