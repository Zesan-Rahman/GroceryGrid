import NavBar from "../components/NavBar";

const COMPANY_NAME = "GroceryGrid";
const FOUNDED_YEAR = "2026";
const CONTACT_EMAIL = "grocerygrid@gmail.com";

const ABOUT_DESCRIPTION =
  "GroceryGrid supports efforts to improve food access by helping people compare grocery options, build cost-conscious shopping plans, and share useful store information with their community.";

const TEAM_MEMBERS = ["Jing Qian", "Zesan Rahman", "Ivan Yeung"];

export default function AboutUs() {
  return (
    <div className="info-page">
      <NavBar />
      <div className="info-shell">
        <main className="info-card">
          <section className="info-hero">
            <p className="info-eyebrow">About Us</p>
            <h1>{COMPANY_NAME}</h1>
            <p className="info-lead">{ABOUT_DESCRIPTION}</p>
          </section>

          <div className="info-grid">
            <section className="info-section">
              <h2>What We Do</h2>
              <p>
                GroceryGrid helps users compare stores, discover item information,
                and make more efficient grocery decisions based on price, store
                coverage, and shared community knowledge.
              </p>
              <p>
                We also want to make it easier for stores and shoppers to contribute
                accurate local data so the platform stays practical and useful.
              </p>
            </section>

            <section className="info-section">
              <h2>At a Glance</h2>
              <div className="info-steps">
                <div className="info-step">
                  <strong>Founded</strong>
                  {FOUNDED_YEAR}
                </div>
                <div className="info-step">
                  <strong>Team Members</strong>
                  {TEAM_MEMBERS.length} contributors
                </div>
                <div className="info-step">
                  <strong>Contact</strong>
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </div>
              </div>
            </section>

            <section className="info-section">
              <h2>Meet the Team</h2>
              <div className="team-grid">
                {TEAM_MEMBERS.map((member) => (
                  <article key={member} className="team-card">
                    <div className="team-avatar" aria-hidden="true">
                      {member.charAt(0)}
                    </div>
                    <h3>{member}</h3>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <footer className="info-footer">
            <p>
              © {new Date().getFullYear()} {COMPANY_NAME}. For questions, contact{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
