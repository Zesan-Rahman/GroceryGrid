import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../api/auth";
import NavBar from "../components/NavBar";

export default function Register() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register(name, email, password);
            navigate("/login", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <NavBar />
            <main className="auth-page">
                <h1>Register</h1>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                    {error ? <p>{error}</p> : null}
                    <button type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Register"}
                    </button>
                </form>
                <p>
                    Already registered? <Link to="/login">Login</Link>
                </p>
            </main>
        </>
    );
}
