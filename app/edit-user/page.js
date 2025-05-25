"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
const host = process.env.NEXT_PUBLIC_API_HOST;
const port = process.env.NEXT_PUBLIC_API_PORT;

const url = `${protocolo}://${host}:${port}/api/auth/update-user`;

export default function EditUserPage() {
    const router = useRouter();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        const carregarDadosUsuario = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) return;

            try {
                const response = await fetch(
                    url
                );
                if (!response.ok) throw new Error("Erro ao carregar usuário");

                const data = await response.json();
                setNome(data.nome);
                setEmail(data.email);
            } catch (error) {
                console.error("Erro ao carregar usuário:", error);
            }
        };

        carregarDadosUsuario();
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, nome, email, senha }),
            });

            if (!response.ok) throw new Error("Erro ao atualizar usuário");

            setMensagem("Dados atualizados com sucesso!");
            setTimeout(() => router.push("/dashboard"));
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            setMensagem("Erro ao atualizar dados. Tente novamente.");
        }
    };

    return (
        <div>
            <h1>Editar Informações do Usuário</h1>
            <form onSubmit={handleSalvar}>
                <div>
                    <label>Nome:</label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Nova Senha:</label>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                    />
                </div>
                <button type="submit">Salvar</button>
            </form>
            {mensagem && <p>{mensagem}</p>}
        </div>
    );
}
