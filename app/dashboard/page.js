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

import styles from './dashboard.module.css';

function BoundTextarea({ gastoId }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!textareaRef.current || !gastoId) return;

        const yDoc = yDocs.get(gastoId); // Pega o Y.Doc do gasto
        if (!yDoc) return;

        const yMap = yDoc.getMap("gasto");
        const yDescricao = yMap.get("descricao"); // Pega o Y.Text da descrição

        if (!yDescricao || !(yDescricao instanceof Y.Text)) {
            console.error("Erro: 'descricao' não é um Y.Text!");
            return;
        }

        // 4. A MÁGICA: Conecta o <textarea> ao Y.Text
        // ISSO É O CORRETO (Usando 'new' para criar uma instância da 'class')
        const binding = new TextAreaBinding(yDescricao, textareaRef.current);

        // Quando o usuário digitar, marca o doc como não-sincronizado
        const observer = () => {
            yMap.set("sincronizado", false);
        };
        yDescricao.observe(observer);

        // 5. Limpa a conexão quando o componente "morre"
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
    const [gastos, setGastos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);

    const [editandoId, setEditandoId] = useState(null);
    //const [descricaoEdit, setDescricaoEdit] = useState("");
    const [valorEdit, setValorEdit] = useState("");

    // Usamos o useCallback para evitar re-criação desnecessária da função
    const runInitialization = useCallback(async () => {
        console.log("Rodando rotina de inicialização/sincronização...");
        setIsLoading(true);
        try {
            const user = await getUserData();
            if (!user || !user.familia_id) {
                console.warn("Usuário ou familia_id não encontrados, redirecionando para login.");
                router.push("/");
                return;
            }
            setUsuario(user);

            // 1. CHAVE: Agora o 'sincronizarComServidor' faz tudo!
            // (Acorda, Puxa e Empurra)
            await sincronizarComServidor(user.familia_id);
            console.log("Sincronização com servidor concluída.");

            //Depois de sincronizar, pega tudo da memória (yjsClient)
            const todos = getGastos().filter(g => g.familia_id === user.familia_id && !g.removido);
            setGastos(todos);
            console.log(`Dashboard atualizada com ${todos.length} gastos.`);

        } catch (err) {
            console.error("Erro na inicialização (pode ser esperado se offline):", err.message);
            // Mesmo offline, tente carregar o que já está na memória
            if (usuario?.familia_id) {
                const todos = getGastos().filter(g => g.familia_id === usuario.familia_id && !g.removido);
                setGastos(todos);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router, usuario?.familia_id]); // Depende do familia_id do usuario

    // useEffect original (agora mais simples)
    useEffect(() => {
        runInitialization();
    }, [runInitialization]); // Roda quando o componente monta

    // NOVO useEffect: Gerenciador de Status da Conexão
    useEffect(() => {
        if (typeof window === "undefined") return;

        setIsOnline(navigator.onLine);
        console.log(`Status inicial da conexão: ${navigator.onLine ? 'Online' : 'Offline'}`);

        const handleOnline = () => {
            console.log("EVENTO: Ficou online. Re-sincronizando...");
            setIsOnline(true);
            //runInitialization(); // Roda a sincronização ao ficar online
        };

        const handleOffline = () => {
            console.log("EVENTO: Ficou offline.");
            setIsOnline(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [runInitialization]);

    // Funções de manipulação de gastos
    const handleRemoveGasto = (gastoId) => {
        removeGasto(gastoId); // O yjsClient agora marca como 'sincronizado: false'
        setGastos(prev => prev.filter(g => g.id !== gastoId));
        // A remoção será sincronizada no próximo 'handleSync' ou 'online'
    };

    const handleEditGasto = async (gastoId, updated) => {
        // A 'descricao' agora é salva automaticamente pelo BoundTextarea.
        // Este 'handle' agora só salva os outros campos, como 'valor'.
        const gastoComFamilia = {
            ...updated,
            familia_id: usuario.familia_id
        };

        // 7. Chamamos o 'editGasto' (que agora ignora a 'descricao')
        await editGasto(gastoId, gastoComFamilia);

        // Atualiza o state local (necessário para o valor)
        setGastos(prev =>
            prev.map(g => (g.id === gastoId ? { ...g, ...updated } : g))
        );
        setEditandoId(null);
    };

    // Botão de "Sincronizar" manual
    const handleSync = async () => {
        if (!usuario || !isOnline) return;
        console.log("Sincronização manual disparada.");
        await runInitialization(); // Apenas chama a rotina principal
    };

    // (O resto do seu JSX de renderização permanece o mesmo)
    // ...
    // ... seu return() JSX aqui ...
    // ...
    if (isLoading) return <p>Carregando...</p>;

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <h2 className={styles.title}>
                    Bem-vindo, {usuario.nome}
                    <span style={{
                        marginLeft: '10px',
                        fontSize: '0.8em',
                        color: isOnline ? 'green' : 'gray'
                    }}>
                    {isOnline ? "● Online" : "○ Offline"}
                </span>
                </h2>

                <div className={styles.buttonsRow}>
                    <button
                        className={styles.button}
                        onClick={() => router.push("/edit-user")}
                        disabled={!isOnline || isLoading}
                    >
                        Editar Informações
                    </button>
                    <button
                        className={styles.button}
                        onClick={handleSync}
                        disabled={!isOnline || isLoading}
                    >
                        {isLoading ? "Sincronizando..." : "Sincronizar"}
                    </button>
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
                                            {/* 8. TROCA DO INPUT PELO TEXTAREA LIGADO */}
                                            <label>Descrição (edita ao vivo):</label>
                                            <BoundTextarea gastoId={gasto.id} />

                                            <label>Valor:</label>
                                            <input
                                                className={styles.input}
                                                type="number"
                                                value={valorEdit}
                                                onChange={e => setValorEdit(e.target.value)}
                                            />
                                            <button
                                                className={styles.button}
                                                onClick={() =>
                                                    // 9. O 'save' agora só salva o VALOR
                                                    handleEditGasto(gasto.id, {
                                                        valor: parseFloat(valorEdit),
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
                                        <span>
  {gasto.descricao} – R${gasto.valor} – {gasto.nome}
                                            <span
                                                className={`${styles.syncIndicator} ${gasto.sincronizado ? styles.syncTrue : styles.syncFalse}`}
                                                title={gasto.sincronizado ? "Sincronizado" : "Não sincronizado"}
                                            />
</span>
                                            <button
                                                className={styles.buttonSmall}
                                                onClick={() => {
                                                    setEditandoId(gasto.id);
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
        </main>
    );
}


// A função getUserData() permanece a mesma
export async function getUserData() {
    try {
        const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
        const host = process.env.NEXT_PUBLIC_API_HOST;
        const port = process.env.NEXT_PUBLIC_API_PORT;

        const stored = localStorage.getItem("userData");
        console.log(stored);
        const userId = stored ? JSON.parse(stored).userId : null;

        const url = `${protocolo}://${host}:${port}/api/buscarusuario?id=${userId}`;

        const res = await fetch(url, {
            cache: "no-store",
        });

        if (!res.ok) throw new Error("Falha ao buscar usuário da API");

        const data = await res.json();

        localStorage.setItem("userData", JSON.stringify({
            userId: data.id,
            nome: data.nome,
            email: data.email,
            familia_id: data.familia_id,
        }));
        console.log(data);
        return data;
    } catch (err) {
        console.warn("Erro ao buscar usuário da API, usando localStorage:", err.message);

        const stored = localStorage.getItem("userData");
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    }
}