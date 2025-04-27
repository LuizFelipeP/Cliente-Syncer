"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    inicializarYjs,  // IMPORTA A FUNÇÃO NOVA
    addGasto,
    removeGasto,
    editGasto,
    getGastos,
    yGastos
} from "@/lib/yjsClient";
import { sincronizarComServidor } from "@/lib/sync";

export default function Dashboard() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [gastos, setGastos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editandoId, setEditandoId] = useState(null);
    const [descricaoEdit, setDescricaoEdit] = useState("");
    const [valorEdit, setValorEdit] = useState("");

    useEffect(() => {
        const inicializarDashboard = async () => {
            try {
                const user = await getUserData();

                if (!user) {
                    throw new Error("Usuário não encontrado");
                }

                setUsuario(user);

                // Inicializa o Yjs para a família específica
                await inicializarYjs(user.familia_id);

                // Depois que o Yjs estiver pronto, sincroniza com servidor
                await sincronizarComServidor(user.familia_id);

                // Agora carrega os gastos filtrados
                const todosGastos = getGastos();
                const gastosDaFamilia = todosGastos.filter(
                    (gasto) => gasto.familia_id === user.familia_id
                );

                setGastos(gastosDaFamilia);
            } catch (error) {
                console.error("Erro ao inicializar dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        inicializarDashboard();
    }, []);

    useEffect(() => {
        if (!yGastos) return;

        const updateUI = () => {
            if (usuario) {
                const todosGastos = getGastos();
                const gastosDaFamilia = todosGastos.filter(
                    (gasto) => gasto.familia_id === usuario.familia_id
                );
                setGastos(gastosDaFamilia);
            }
        };

        yGastos.observe(updateUI);

        return () => {
            yGastos.unobserve(updateUI);
        };
    }, [usuario]); // Só observar depois que o usuário estiver carregado

    const handleAddGasto = (gasto) => {
        addGasto(gasto);
    };

    const handleRemoveGasto = (gastoId) => {
        removeGasto(gastoId);
    };

    const handleEditGasto = (gastoId, updatedGasto) => {
        editGasto(gastoId, updatedGasto);
    };

    if (isLoading) {
        return <p>Carregando...</p>;
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <div>
                <h2>Bem-vindo, {usuario?.nome || "Usuário"}</h2>
                <button onClick={() => router.push("/edit-user")}>
                    Editar Informações
                </button>
            </div>

            <div>
                <h3>Gastos Registrados</h3>
                <button onClick={() => router.push("/add-gasto")}>
                    Adicionar Gasto
                </button>

                <ul>
                    {gastos.length > 0 ? (
                        gastos.map((gasto) => (
                            <li key={gasto.id}>
                                {editandoId === gasto.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={descricaoEdit}
                                            onChange={(e) => setDescricaoEdit(e.target.value)}
                                            placeholder="Descrição"
                                        />
                                        <input
                                            type="number"
                                            value={valorEdit}
                                            onChange={(e) => setValorEdit(e.target.value)}
                                            placeholder="Valor"
                                        />
                                        <button
                                            onClick={() => {
                                                handleEditGasto(gasto.id, {
                                                    ...gasto,
                                                    descricao: descricaoEdit,
                                                    valor: parseFloat(valorEdit),
                                                    sincronizado: false,
                                                });
                                                setEditandoId(null);
                                            }}
                                        >
                                            Salvar
                                        </button>
                                        <button onClick={() => setEditandoId(null)}>
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span>
                                            {gasto.descricao} - R${gasto.valor} - {gasto.nome} - {gasto.familia_id}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setEditandoId(gasto.id);
                                                setDescricaoEdit(gasto.descricao);
                                                setValorEdit(gasto.valor);
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button onClick={() => handleRemoveGasto(gasto.id)}>
                                            Remover
                                        </button>
                                    </>
                                )}
                            </li>
                        ))
                    ) : (
                        <p>Nenhum gasto registrado.</p>
                    )}
                </ul>
            </div>

            <div>
                <button onClick={() => router.push("/")}>
                    Logoff
                </button>
            </div>
        </div>
    );
}

// Função para obter os dados do usuário
export async function getUserData() {
    try {
        const userId = localStorage.getItem("userId");

        if (!userId) {
            throw new Error("Usuário não autenticado.");
        }

        const response = await fetch(`http://192.168.0.11:3008/api/user?id=${userId}`);

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
