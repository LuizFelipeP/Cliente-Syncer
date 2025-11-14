"use client";
import * as Y from "yjs";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    addGasto,
    removeGasto,
    editGasto,
    getGastos,
    yDocs
} from "@/lib/yjsClient";
import { sincronizarComServidor } from "@/lib/sync";
import { TextAreaBinding  } from "y-textarea";

// MUDANÇA: Não importamos mais 'atualizarPonteiroGasto'
import {
    initCategories,
    moverGastoParaCategoria,
    getEstruturaCategorias,
    yRootMap as yRootCategories
} from "@/lib/yjsCategorias";

import styles from './dashboard.module.css';

// MUDANÇA: BoundTextarea não chama mais 'atualizarPonteiroGasto'
function BoundTextarea({ gastoId }) {
    const textareaRef = useRef(null);
    useEffect(() => {
        if (!textareaRef.current || !gastoId) return;

        const yDoc = yDocs.get(gastoId);
        if (!yDoc) return;

        const yMap = yDoc.getMap("gasto");
        const yDescricao = yMap.get("descricao");

        if (!yDescricao || !(yDescricao instanceof Y.Text)) {
            console.error("Erro: 'descricao' não é um Y.Text!");
            return;
        }

        const binding = new TextAreaBinding(yDescricao, textareaRef.current);

        const observer = () => {
            // Só precisamos marcar o doc real como "sujo"
            yMap.set("sincronizado", false);
        };
        yDescricao.observe(observer);

        return () => {
            yDescricao.unobserve(observer);
            binding.destroy();
        };
    }, [gastoId]);
    return (
        <textarea
            ref={textareaRef}
            className={styles.input}
            placeholder="Editando descrição ao vivo..."
        />
    );
}


export default function Dashboard() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [editandoId, setEditandoId] = useState(null);
    const [valorEdit, setValorEdit] = useState("");
    const [estruturaCategorias, setEstruturaCategorias] = useState({});

    // --- CORREÇÃO MAIS IMPORTANTE AQUI (refreshUI) ---
    // A UI agora é "hidratada" com os dados reais
    const refreshUI = useCallback(() => {
        // 1. Pega os DADOS REAIS (Fonte da Verdade)
        // 'getGastos' converte Y.Text -> string (o texto mesclado correto!)
        const gastosReais = getGastos();

        // 2. Cria um Mapa para consulta rápida
        // Agora temos: Map { "gastoId-123" => { id: "123", descricao: "Texto Mesclado XY" } }
        const gastosMap = new Map(gastosReais.map(g => [g.id, g]));

        // 3. Pega a ESTRUTURA (as "gavetas")
        // 'gastosReais' é passado para filtrar os 'removidos'
        const estruturaEsqueleto = getEstruturaCategorias(gastosReais);

        // 4. "Hidratação": Preenche a estrutura com os dados reais
        const estruturaHidratada = {};
        for (const [catId, categoria] of Object.entries(estruturaEsqueleto)) {

            estruturaHidratada[catId] = {
                ...categoria, // nome: "Alimentação"
                gastos: categoria.gastos.map(ponteiro => {
                    // ponteiro = { id: "gasto-123", categoriaId: "deslocamento" }
                    const gastoReal = gastosMap.get(ponteiro.id); // gastoReal = { id: "...", descricao: "Q", ... }

                    if (!gastoReal) {
                        // O fallback também precisa da categoriaId
                        return { ...ponteiro, nome: "Carregando..." };
                    }

                    // CORREÇÃO: Mescla os dados reais (gastoReal)
                    // com os dados do ponteiro (que tem a categoriaId)
                    return { ...gastoReal, ...ponteiro };
                })
            };
        }

        setEstruturaCategorias(estruturaHidratada);
    }, []);
    // --- FIM DA CORREÇÃO ---

    const runSync = useCallback(async () => {
        console.log("Sincronizando...");
        if (!usuario) return;
        try {
            await sincronizarComServidor(usuario.familia_id);
            refreshUI();
        } catch (err) {
            console.error(err);
            refreshUI();
        }
    }, [usuario, refreshUI]);

    // useEffect de Inicialização (corrigido, à prova de corrida)
    useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                await initCategories();
                console.log("Categorias prontas.");

                const user = await getUserData();
                if (!user || !user.familia_id) {
                    router.push("/");
                    return;
                }
                setUsuario(user);

                await sincronizarComServidor(user.familia_id);
                console.log("Sincronização inicial concluída.");

                refreshUI();

            } catch (err) {
                console.error("Falha na inicialização:", err);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [refreshUI, router]);

    // useEffect de Observação (corrigido)
    useEffect(() => {
        // Observador único para TUDO
        const docObserver = () => {
            console.log("Mudança detectada, atualizando UI...");
            refreshUI();
        };

        // Observa o Map de categorias
        yRootCategories.observeDeep(docObserver);
        // Observa os docs de gastos
        yDocs.forEach(doc => doc.on('update', docObserver));

        return () => {
            yRootCategories.unobserveDeep(docObserver);
            yDocs.forEach(doc => doc.off('update', docObserver));
        };
    }, [refreshUI]);

    // ... (useEffect de Online/Offline permanece igual) ...
    useEffect(() => {
        if (typeof window === "undefined") return;
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleRemoveGasto = async (gastoId) => {
        await removeGasto(gastoId);
        refreshUI();
    };

    const handleEditGasto = async (gastoId, updated) => {
        const gastoComFamilia = { ...updated, familia_id: usuario.familia_id };
        await editGasto(gastoId, gastoComFamilia);
        setEditandoId(null);
    };

    const handleMoveCategoria = async (gastoId, novaCategoriaId) => {
        await moverGastoParaCategoria(gastoId, novaCategoriaId);
    };

    const handleSync = async () => {
        if (!usuario || !isOnline) return;
        setIsLoading(true);
        await runSync();
        setIsLoading(false);
    };

    if (isLoading) return <p>Carregando...</p>;
    if (!usuario) return <p>Erro ao carregar usuário.</p>;

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <h2 className={styles.title}>Bem-vindo, {usuario.nome}</h2>
                <div className={styles.buttonsRow}>
                    <button className={styles.button} onClick={() => router.push("/edit-user")} disabled={!isOnline || isLoading}>
                        Editar Informações
                    </button>
                    <button className={styles.button} onClick={handleSync} disabled={!isOnline || isLoading}>
                        {isLoading ? "Sincronizando..." : "Sincronizar"}
                    </button>
                </div>

                <section className={styles.section}>
                    <h3 className={styles.subtitle}>Gastos Registrados</h3>
                    <button className={styles.button} onClick={() => router.push("/add-gasto")}>
                        Adicionar Gasto
                    </button>

                    <div className={styles.categoryContainer}>
                        {Object.entries(estruturaCategorias).map(([catId, categoria]) => (
                            <div key={catId} className={styles.categoryGroup}>
                                <h4 className={styles.categoryTitle}>{categoria.nome}</h4>
                                <ul className={styles.gastosList}>
                                    {categoria.gastos.length === 0 && <small>Vazio</small>}

                                    {categoria.gastos.map(gasto => (
                                        <li key={gasto.id} className={styles.gastoItem}>
                                            {editandoId === gasto.id ? (
                                                <>
                                                    <label>Descrição:</label>
                                                    <BoundTextarea gastoId={gasto.id} />
                                                    <label>Valor:</label>
                                                    <input className={styles.input} type="number" value={valorEdit} onChange={e => setValorEdit(e.targt.value)} />

                                                    <label>Categoria:</label>
                                                    <select className={styles.input} value={gasto.categoriaId} onChange={(e) => handleMoveCategoria(gasto.id, e.target.value)}>
                                                        {Object.entries(estruturaCategorias).map(([id, cat]) => (
                                                            <option key={id} value={id}>{cat.nome}</option>
                                                        ))}
                                                    </select>

                                                    <button className={styles.button} onClick={() => handleEditGasto(gasto.id, { valor: parseFloat(valorEdit) })}>
                                                        Salvar
                                                    </button>
                                                    <button className={styles.buttonSecondary} onClick={() => setEditandoId(null)}>Cancelar</button>
                                                </>
                                            ) : (
                                                <>
                                                    {/* MUDANÇA: Lendo a 'descricao' (do Y.Text) e 'valor' */}
                                                    <span>{gasto.descricao} – R${gasto.valor}</span>

                                                    <button className={styles.buttonSmall} onClick={() => {
                                                        setEditandoId(gasto.id);
                                                        // O 'gasto.valor' já é o valor real
                                                        setValorEdit(gasto.valor || 0);
                                                    }}>Editar</button>
                                                    <button className={styles.buttonSmallSecondary} onClick={() => handleRemoveGasto(gasto.id)}>Remover</button>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
                <footer className={styles.footer}>
                    <button className={styles.logoffButton} onClick={() => router.push("/")}>Logoff</button>
                </footer>
            </div>
        </main>
    );
}

export async function getUserData() {
    try {
        const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
        const host = process.env.NEXT_PUBLIC_API_HOST;
        const port = process.env.NEXT_PUBLIC_API_PORT;
        const stored = localStorage.getItem("userData");
        const userId = stored ? JSON.parse(stored).userId : null;
        if (!userId) return null;
        const url = `${protocolo}://${host}:${port}/api/buscarusuario?id=${userId}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Falha API");
        const data = await res.json();
        localStorage.setItem("userData", JSON.stringify({
            userId: data.id, nome: data.nome, email: data.email, familia_id: data.familia_id
        }));
        return data;
    } catch (err) {
        const stored = localStorage.getItem("userData");
        return stored ? JSON.parse(stored) : null;
    }
}