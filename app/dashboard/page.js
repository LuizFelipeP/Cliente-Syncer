

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    inicializarYjsParaGasto,
    addGasto,
    removeGasto,
    editGasto,
    getGastos,
} from "@/lib/yjsClient";
import { sincronizarComServidor } from "@/lib/sync";

import styles from './dashboard.module.css';

export default function Dashboard() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [gastos, setGastos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editandoId, setEditandoId] = useState(null);
    const [descricaoEdit, setDescricaoEdit] = useState("");
    const [valorEdit, setValorEdit] = useState("");

    useEffect(() => {
        const init = async () => {
            try {
                const user = await getUserData();
                if (!user) throw new Error("Usuário não encontrado");
                setUsuario(user);

                // 1) Sincroniza TODOS os docs de gasto já inicializados
                await sincronizarComServidor(user.familia_id);

                // 2) Depois de aplicado o update, pega tudo do yjsClient
                const todos = getGastos().filter(g => g.familia_id === user.familia_id && !g.removido);
                setGastos(todos);
            } catch (err) {
                console.error("Erro ao inicializar dashboard:", err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    // --- Removi completamente este useEffect ---
    // useEffect(() => {
    //   if (!yGastos) return;
    //   const updateUI = () => { … }
    //   yGastos.observe(updateUI);
    //   return () => yGastos.unobserve(updateUI);
    // }, [usuario]);

    const handleAddGasto = async (gasto) => {
        await addGasto(gasto);
        setGastos(prev => [...prev, gasto]);
    };

    const handleRemoveGasto = (gastoId) => {
        removeGasto(gastoId);
        setGastos(prev => prev.filter(g => g.id !== gastoId));
    };

    const handleEditGasto = async (gastoId, updated) => {
        await editGasto(gastoId, updated);
        setGastos(prev =>
            prev.map(g => (g.id === gastoId ? { ...g, ...updated } : g))
        );
        setEditandoId(null);
    };

    const handleSync = async () => {
        if (!usuario) return;
        await sincronizarComServidor(usuario.familia_id);
        const todos = getGastos().filter(g => g.familia_id === usuario.familia_id && !g.removido);
        setGastos(todos);
    };

    if (isLoading) return <p>Carregando...</p>;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Bem-vindo, {usuario.nome}</h2>

            <div className={styles.buttonsRow}>
                <button className={styles.button} onClick={() => router.push("/edit-user")}>
                    Editar Informações
                </button>
                <button className={styles.button} onClick={handleSync}>🔄 Sincronizar</button>
            </div>

            <section className={styles.section}>
                <h3 className={styles.subtitle}>Gastos Registrados</h3>
                <button className={styles.button} onClick={() => router.push("/add-gasto")}>
                    Adicionar Gasto
                </button>
                <ul className={styles.gastosList}>
                    {gastos.length > 0 ? (
                        gastos.map(gasto => (
                            <li key={gasto.id} className={styles.gastoItem}>
                                {editandoId === gasto.id ? (
                                    <>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            value={descricaoEdit}
                                            onChange={e => setDescricaoEdit(e.target.value)}
                                        />
                                        <input
                                            className={styles.input}
                                            type="number"
                                            value={valorEdit}
                                            onChange={e => setValorEdit(e.target.value)}
                                        />
                                        <button
                                            className={styles.button}
                                            onClick={() =>
                                                handleEditGasto(gasto.id, {
                                                    ...gasto,
                                                    descricao: descricaoEdit,
                                                    valor: parseFloat(valorEdit),
                                                    sincronizado: false,
                                                })
                                            }
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            className={styles.buttonSecondary}
                                            onClick={() => setEditandoId(null)}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span>{gasto.descricao} – R${gasto.valor} – {gasto.nome}</span>
                                        <button
                                            className={styles.buttonSmall}
                                            onClick={() => {
                                                setEditandoId(gasto.id);
                                                setDescricaoEdit(gasto.descricao);
                                                setValorEdit(gasto.valor);
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className={styles.buttonSmallSecondary}
                                            onClick={() => handleRemoveGasto(gasto.id)}
                                        >
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
            </section>

            <footer className={styles.footer}>
                <button className={styles.logoffButton} onClick={() => router.push("/")}>Logoff</button>
            </footer>
        </div>
    );
}

// (mantive getUserData igual ao seu último exemplo)
export async function getUserData() {
    try {
        const userId = localStorage.getItem("userId");
        if (!userId) throw new Error("Usuário não autenticado.");
        const res = await fetch(`http://192.168.0.3:3008/api/user?id=${userId}`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Erro ao buscar usuário: ${res.status} - ${text}`);
        }
        return await res.json();
    } catch (err) {
        console.error("Erro na API:", err);
        return null;
    }
}
