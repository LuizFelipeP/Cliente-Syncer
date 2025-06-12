"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addGasto } from "@/lib/yjsClient";
import { getUserData } from "../dashboard/page.js";
import { v4 as uuidv4 } from 'uuid';
import styles from './addgasto.module.css';

export default function AddGasto() {
    const router = useRouter();
    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!descricao || !valor) {
            alert("Preencha todos os campos!");
            return;
        }

        const userData = localStorage.getItem("userData");
        if (!userData) {
            alert("Erro: Usuário não autenticado!");
            return;
        }



        const usuario = await getUserData();

        const userId = usuario.id;

        const gastoId = uuidv4();

        const novoGasto = {
            id: gastoId,
            descricao,
            valor: parseFloat(valor),
            timestamp_criacao: new Date().toISOString(),
            criadoPor: userId,
            nome: usuario.nome,
            familia_id: usuario.familia_id,
            sincronizado: false,
            removido:false,
        };
        console.log(novoGasto);

        try {
            await addGasto(novoGasto);
            console.log("Gasto salvo localmente:", novoGasto);
            router.push("/dashboard");
        } catch (error) {
            console.error("Erro ao adicionar gasto:", error);
            alert("Erro ao salvar gasto.");
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <h1 className={styles.title}>Adicionar Gasto</h1>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Descrição:</label>
                        <input
                            type="text"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Valor:</label>
                        <input
                            type="number"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                        />
                    </div>
                    <button type="submit" className={`${styles.button} ${styles.submit}`}>
                        Adicionar
                    </button>
                </form>
                <button
                    onClick={() => router.push('/dashboard')}
                    className={`${styles.button} ${styles.back}`}
                >
                    Voltar
                </button>
            </div>
        </main>
    );
}
