"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sha256 } from "js-sha256";
import styles from "./login.module.css";





async function hashSenha(senha) {
    return sha256(senha);
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        if (!email.includes("@")) {
            setErro("Email inválido!");
            return;
        }

        const senhaHash = await hashSenha(senha);


        try {
            const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
            const host = process.env.NEXT_PUBLIC_API_HOST;
            const port = process.env.NEXT_PUBLIC_API_PORT;

            const url = `${protocolo}://${host}:${port}/api/auth/login`;

            const res = await fetch(url, {
                method: "POST",
                body: JSON.stringify({ email, senha }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                //Salva os dados para login offline
                localStorage.setItem("userData", JSON.stringify(data));
                //Também salva o hash para autenticar offline
                localStorage.setItem("senhaHash", senhaHash);

                router.push("/dashboard");
            } else {
                setErro("Email ou senha incorretos!");
            }
        } catch {
           //tenta login offline
            const stored = localStorage.getItem("userData");
            const storedHash = localStorage.getItem("senhaHash");

            if (stored) {
                const user = JSON.parse(stored);
                if (user.email === email && storedHash === senhaHash) {
                    router.push("/dashboard");
                    return;
                }
            }
            setErro("Sem conexão e dados inválidos para login offline.");
        }
    }

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <h1 className={styles.title}>Login</h1>
                {erro && <p className={styles.error}>{erro}</p>}
                <form onSubmit={handleLogin}>
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                    <button type="submit" className={styles.button}>
                        Entrar
                    </button>
                </form>
            </div>
        </main>

    );
}