import { Hero } from "@/components/site/hero";
import { contactHref, instagramHref, siteContent } from "@/content/site";

export default function Home() {
  return (
    <main>
      <Hero />

      <div className="post-hero">
        <section
          className="statement section-shell stack-section"
          aria-labelledby="statement"
        >
        <p className="section-label">ABOUT</p>
        <h2 id="statement">
          <span>{siteContent.introduction[0]}</span>
          <span>{siteContent.introduction[1]}</span>
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

        <div className="service-grid">
          {siteContent.services.map((service) => (
            <article className="service-card" key={service.index}>
              <p className="item-index">{service.index}</p>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
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

        <div className="work-list">
          {siteContent.work.map((project, index) => (
            <article className="work-row" key={project.name}>
              <span className="item-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{project.name}</h3>
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
          ))}
        </div>
      </section>

      <section
        id="contact"
        className="contact-section"
        aria-labelledby="contact-title"
      >
        <p className="section-label">START A CONVERSATION</p>
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
      </section>

        <footer className="site-footer section-shell">
          <p>© 2026 CNNCT.APP</p>
          <a href="#">BACK TO TOP</a>
        </footer>
      </div>
    </main>
  );
}
