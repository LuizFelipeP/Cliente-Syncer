"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./edituser.module.css";
import {getUserData} from "@/app/dashboard/page.js";

const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
const host = process.env.NEXT_PUBLIC_API_HOST;
const port = process.env.NEXT_PUBLIC_API_PORT;



export default function EditUserPage() {
    const router = useRouter();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [userId, setUserId] = useState("");
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        const carregarDadosUsuario = async () => {
            const usuario = await getUserData()
            console.log(usuario);
            setNome(usuario.nome);
            setEmail(usuario.email);
            setUserId(usuario.id);

        };

        carregarDadosUsuario();
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!userId) return;
        const url = `${protocolo}://${host}:${port}/api/auth/atualizar-usuario`;

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, nome, email, senha }),
            });

            if (!response.ok) throw new Error("Erro ao atualizar usuário");
            const novo = await getUserData();
            setNome(novo.nome);
            setEmail(novo.email);

            setMensagem("Dados atualizados com sucesso!");
            setTimeout(() => router.push("/dashboard"));
            router.refresh();
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            setMensagem("Erro ao atualizar dados. Tente novamente.");
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.container}>
                <h1 className={styles.title}>Editar Informações do Usuário</h1>
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
                    <button type="submit" className={styles.button}>Salvar</button>
                </form>
                {mensagem && <p className={styles.message}>{mensagem}</p>}
            </div>
        </div>

    );
}
