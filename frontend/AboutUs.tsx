import React from "react";
// import "./AboutUs.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
}

interface TeamMember {
  name: string;
  // bio: string;
}

// ─── Data (fill these in) ─────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

const COMPANY_NAME = "GroceryGrid";

const ABOUT_DESCRIPTION = `
  Replace this with a paragraph or two describing your company — your mission,
  what you do, who you serve, and what makes you unique.
`;

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Jane Doe",
    role: "CEO & Co-Founder",
    bio: "Brief bio about Jane — her background, expertise, and passion.",
    avatarUrl: "", // e.g. "/images/jane.jpg"
  },
  {
    name: "John Smith",
    role: "CTO & Co-Founder",
    bio: "Brief bio about John — his background, expertise, and passion.",
    avatarUrl: "",
  },
];

const FOUNDED_YEAR = "20XX";
const LOCATION = "City, State / Country";
const CONTACT_EMAIL = "hello@yourcompany.com";

// ─── Sub-components ───────────────────────────────────────────────────────────

const Navbar: React.FC = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.navBrand}>{COMPANY_NAME}</div>
      <ul style={styles.navLinks}>
        {NAV_LINKS.map((link) => (
          <li key={link.href} style={styles.navItem}>
            <a href={link.href} style={styles.navAnchor}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const HeroSection: React.FC = () => (
  <section style={styles.hero}>
    <h1 style={styles.heroTitle}>{COMPANY_NAME}</h1>
    <p style={styles.heroTagline}>{COMPANY_TAGLINE}</p>
  </section>
);

const AboutSection: React.FC = () => (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>Who We Are</h2>
    <p style={styles.sectionText}>{ABOUT_DESCRIPTION}</p>
  </section>
);

const StatsSection: React.FC = () => (
  <section style={{ ...styles.section, ...styles.statsSection }}>
    <div style={styles.statCard}>
      <span style={styles.statNumber}>Founded</span>
      <span style={styles.statLabel}>{FOUNDED_YEAR}</span>
    </div>
    <div style={styles.statCard}>
      <span style={styles.statNumber}>{TEAM_MEMBERS.length}+</span>
      <span style={styles.statLabel}>Team Members</span>
    </div>
    <div style={styles.statCard}>
      <span style={styles.statNumber}>📍</span>
      <span style={styles.statLabel}>{LOCATION}</span>
    </div>
  </section>
);

const TeamSection: React.FC = () => (
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>Meet the Team</h2>
    <div style={styles.teamGrid}>
      {TEAM_MEMBERS.map((member) => (
        <div key={member.name} style={styles.teamCard}>
          <div style={styles.avatar}>
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {member.name.charAt(0)}
              </div>
            )}
          </div>
          <h3 style={styles.memberName}>{member.name}</h3>
          <p style={styles.memberRole}>{member.role}</p>
          <p style={styles.memberBio}>{member.bio}</p>
        </div>
      ))}
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer style={styles.footer}>
    <p>
      © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
    </p>
    <p>
      <a href={`mailto:${CONTACT_EMAIL}`} style={styles.footerLink}>
        {CONTACT_EMAIL}
      </a>
    </p>
  </footer>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AboutUs: React.FC = () => {
  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>
        <HeroSection />
        <AboutSection />
        <StatsSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs;

// ─── Inline Styles ────────────────────────────────────────────────────────────
// Feel free to replace these with Tailwind classes, CSS modules, or
// a styled-components / emotion setup that matches your project.

const styles: Record<string, React.CSSProperties> = {
  /* Layout */
  page: {
    fontFamily: "'Georgia', serif",
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flex: 1,
    maxWidth: "900px",
    margin: "0 auto",
    width: "100%",
    padding: "0 1.5rem",
  },

  /* Navbar */
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e5e5",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navBrand: {
    fontWeight: "bold",
    fontSize: "1.25rem",
    letterSpacing: "0.02em",
  },
  navLinks: {
    display: "flex",
    gap: "1.5rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  navItem: {},
  navAnchor: {
    textDecoration: "none",
    color: "#444",
    fontSize: "0.95rem",
    transition: "color 0.2s",
  },

  /* Hero */
  hero: {
    textAlign: "center",
    padding: "4rem 1rem 2rem",
  },
  heroTitle: {
    fontSize: "2.75rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  },
  heroTagline: {
    fontSize: "1.2rem",
    color: "#666",
    maxWidth: "520px",
    margin: "0 auto",
  },

  /* Sections */
  section: {
    padding: "3rem 0",
    borderTop: "1px solid #ececec",
  },
  sectionTitle: {
    fontSize: "1.6rem",
    marginBottom: "1rem",
    fontWeight: "600",
  },
  sectionText: {
    lineHeight: "1.8",
    color: "#444",
    maxWidth: "680px",
  },

  /* Stats */
  statsSection: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    minWidth: "120px",
  },
  statNumber: {
    fontSize: "1.5rem",
    fontWeight: "700",
  },
  statLabel: {
    fontSize: "0.85rem",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  /* Team */
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "2rem",
    marginTop: "1rem",
  },
  teamCard: {
    backgroundColor: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: "8px",
    padding: "1.5rem",
    textAlign: "center",
  },
  avatar: {
    marginBottom: "1rem",
  },
  avatarImg: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#d4d4d4",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#fff",
  },
  memberName: {
    margin: "0 0 0.25rem",
    fontSize: "1.05rem",
  },
  memberRole: {
    color: "#888",
    fontSize: "0.85rem",
    marginBottom: "0.75rem",
  },
  memberBio: {
    fontSize: "0.9rem",
    color: "#555",
    lineHeight: "1.6",
  },

  /* Footer */
  footer: {
    textAlign: "center",
    padding: "2rem",
    fontSize: "0.85rem",
    color: "#aaa",
    borderTop: "1px solid #ececec",
  },
  footerLink: {
    color: "#888",
    textDecoration: "none",
  },
};
