"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

        const res = await fetch("http://192.168.0.2:3008/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, senha }),
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();
        localStorage.setItem("userId", data.userId); // 🔥 Salva o ID do usuário
        console.log(res);

        if (res.ok) {
            router.push("/dashboard"); // Redireciona para o dashboard
        } else {
            setErro("Email ou senha incorretos!");
        }
    }

    return (
        <div>
            <h1>Login</h1>
            {erro && <p style={{ color: "red" }}>{erro}</p>}
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                />
                <button type="submit">Entrar</button>
            </form>
        </div>
    );
}
