"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addGasto, removeGasto, editGasto, getGastos, yDoc, yGastos } from "@/lib/yjsClient";
import { sincronizarComServidor } from "@/lib/sync";

export default function Dashboard() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [gastos, setGastos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar os dados do usuário
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = await getUserData();
                if (user) {
                    setUsuario(user);
                }
            } catch (error) {
                console.error("Erro ao buscar usuário:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Buscar gastos e sincronizar com o servidor
    useEffect(() => {
        const syncAndLoadData = async () => {
            await sincronizarComServidor();
            setGastos(getGastos());
        };
        syncAndLoadData();
    }, []);

    // Observar mudanças nos gastos e atualizar a UI automaticamente
    useEffect(() => {
        const updateUI = () => setGastos(getGastos());

        yGastos.observe(updateUI);

        return () => yGastos.unobserve(updateUI); // Remover observador ao desmontar
    }, []);

    // Adicionar um novo gasto
    const handleAddGasto = (gasto) => {
        addGasto(gasto);
    };

    // Remover um gasto
    const handleRemoveGasto = (gastoId) => {
        removeGasto(gastoId);
    };

    // Editar um gasto
    const handleEditGasto = (gastoId, updatedGasto) => {
        editGasto(gastoId, updatedGasto);
    };

    // Enquanto os dados estão carregando, exibir um loading
    if (isLoading) {
        return <p>Carregando...</p>;
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <div>
                <h2>Bem-vindo, {usuario?.nome || "Usuário"}</h2>
                <button onClick={() => router.push("/edit-user")}>Editar Informações</button>
            </div>

            <div>
                <h3>Gastos Registrados</h3>
                <button onClick={() => router.push("/add-gasto")}>Adicionar Gasto</button>

                <ul>
                    {gastos.length > 0 ? (
                        gastos.map((gasto) => (
                            <li key={gasto.id}>
                                <span>{gasto.descricao} - R${gasto.valor} - {gasto.nome}</span>
                                <button onClick={() => handleEditGasto(gasto.id, gasto)}>Editar</button>
                                <button onClick={() => handleRemoveGasto(gasto.id)}>Remover</button>
                            </li>
                        ))
                    ) : (
                        <p>Nenhum gasto registrado.</p>
                    )}
                </ul>
            </div>
        </div>
    );
}

// Função para obter os dados do usuário
export async function getUserData() {
    try {
        // Obter userId do localStorage
        const userId = localStorage.getItem("userId");

        if (!userId) {
            throw new Error("Usuário não autenticado.");
        }
        const response = await fetch(`http://192.168.0.2:3008/api/user?id=${userId}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar usuário: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro na API:", error);
        return null;
    }
}
