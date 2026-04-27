import NavBar from "../components/NavBar";

export default function ContactUs() {
    return (
        <div className="info-page">
            <NavBar />
            <div className="info-shell">
                <main className="info-card">
                    <section className="info-hero">
                        <p className="info-eyebrow">Contact Us</p>
                        <h1>Create a Grocery Store Account</h1>
                        <p className="info-lead">
                            Grocery store owners can request a GroceryGrid account linked to their
                            store by emailing{" "}
                            <a href="mailto:grocerygrid@gmail.com">grocerygrid@gmail.com</a>.
                        </p>
                    </section>

                    <div className="info-grid"> <section className="info-section">
                        <h2>What to Send</h2>
                        <p>
                            Include enough detail for us to identify the store and verify who
                            should manage the account.
                        </p>
                        <ul className="info-list">
                            <li>Store name</li>
                            <li>Store address and location details</li>
                            <li>Your name and role at the store</li>
                            <li>The email used for the account that you want to be a store owner account</li>
                            <li>Preferred contact email and phone number</li>
                            <li>Any proof that help us verify store ownership</li>
                        </ul>
                    </section>

                        <section className="info-section">
                            <h2>What Happens Next</h2>
                            <div className="info-steps">
                                <div className="info-step">
                                    <strong>1. Send your request</strong>
                                    <p>Email <a href="mailto:grocerygrid@gmail.com">grocerygrid@gmail.com</a>{" "}
                                        with your store information.</p>
                                </div>
                                <div className="info-step">
                                    <strong>2. We review the details</strong>
                                    <p>We verify the store information and confirm that the account should
                                        be linked to that location.</p>
                                </div>
                                <div className="info-step">
                                    <strong>3. We follow up</strong>
                                    <p>Our team will reach out with next steps once the request has been
                                        reviewed.</p>
                                </div>
                            </div>
                        </section>

                        <section className="info-section">
                            <h2>Questions?</h2>
                            <p>
                                If you have questions about onboarding or store access, use the same
                                email and we will respond as soon as possible.
                            </p>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
