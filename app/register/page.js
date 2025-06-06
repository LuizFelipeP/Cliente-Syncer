"use client";
import { useState } from "react";

const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
const host = process.env.NEXT_PUBLIC_API_HOST;
const port = process.env.NEXT_PUBLIC_API_PORT;


const url = `${protocolo}://${host}:${port}/api/auth/register`;

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [familia, setFamilia] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, username, password, familia }),
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registrado com sucesso! Você será redirecionado para o login.");
            window.location.href = "/login";
        } else {
            setError(data.error || "Erro desconhecido.");
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nome"
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="E-mail"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Senha"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Nome da Família"
                    onChange={(e) => setFamilia(e.target.value)}
                    required
                />
                <button type="submit">Registrar</button>
            </form>
            {error && <div style={{ color: "red" }}>{error}</div>}
        </div>
    );
}
