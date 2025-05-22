"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addGasto } from "@/lib/yjsClient";
import { getUserData } from "../dashboard/page.js";
import { v4 as uuidv4 } from 'uuid';

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

        const userId = localStorage.getItem("userId");
        if (!userId) {
            alert("Erro: Usuário não autenticado!");
            return;
        }

        const usuario = await getUserData();

        const gastoId = uuidv4(); // Gasto ID individual

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
            console.log("📢 Gasto salvo localmente:", novoGasto);
            router.push("/dashboard");
        } catch (error) {
            console.error("❌ Erro ao adicionar gasto:", error);
            alert("Erro ao salvar gasto.");
        }
    };

    return (
        <div>
            <h1>Adicionar Gasto</h1>
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
                <button type="submit">Adicionar</button>
            </form>
            <button onClick={() => router.push("/dashboard")}>Voltar</button>
        </div>
    );
}
