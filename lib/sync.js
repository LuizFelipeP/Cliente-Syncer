import {
    inicializarYjsParaGasto,
    getYjsStateVector,
    applyYjsUpdate,
    getFullYjsUpdate,
    yDocs,
} from "./yjsClient";
import { getLocalGastoIds, addLocalGastoId } from "./gastoIdStore";


export async function sincronizarComServidor(familiaId) {
    if (!familiaId) {
        console.error("sincronizarComServidor chamado sem familiaId");
        return;
    }

    // Definindo URLs
    const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
    const host = process.env.NEXT_PUBLIC_API_HOST;
    const port = process.env.NEXT_PUBLIC_API_PORT;
    const urlPull = `${protocolo}://${host}:${port}/api/sincronizarStateVector`;
    const urlPush = `${protocolo}://${host}:${port}/api/sincronizar`; // URL que você já usa

    try {
        // --- ETAPA 1: "ACORDAR" DOCS LOCAIS ---
        console.log("Sincronização: Etapa 1 - Acordando docs locais...");
        const localGastoIds = getLocalGastoIds(familiaId);
        console.log(`Encontrados ${localGastoIds.length} gastos no índice local.`);

        const initPromises = localGastoIds.map(id => inicializarYjsParaGasto(id, familiaId));
        await Promise.all(initPromises);
        console.log("Docs locais carregados do IndexedDB para a memória.");


        // ************************************************************
        // MUDANÇA: ETAPA DE PUSH (3) AGORA VEM ANTES DA ETAPA DE PULL (2)
        // ************************************************************

        // --- ETAPA 2 (NOVA ORDEM): "PUSH" DE DADOS LOCAIS ---
        console.log("Sincronização: Etapa 2 - Enviando (PUSH) dados locais...");
        const pushPromises = [];

        for (const [gastoId, yDoc] of yDocs.entries()) {
            const yMap = yDoc.getMap("gasto");

            // Verifica se o gasto não está sincronizado E pertence à família atual
            if (yMap.get("sincronizado") === false && yMap.get("familia_id") === familiaId) {
                console.log(`Encontrado doc não sincronizado: ${gastoId}. Tentando PUSH...`);

                const fullUpdate = getFullYjsUpdate(gastoId);
                if (!fullUpdate) continue;

                const updateBase64 = Buffer.from(fullUpdate).toString("base64");

                // Adiciona a promise de fetch ao array (exatamente como seu código já fazia)
                pushPromises.push(
                    fetch(urlPush, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            gastoId,
                            familiaId,
                            update: updateBase64,
                        }),
                    }).then(res => {
                        if (res.ok) {
                            console.log(`PUSH de ${gastoId} BEM-SUCEDIDO.`);
                            yMap.set("sincronizado", true);
                        } else {
                            console.error(`PUSH de ${gastoId} FALHOU: ${res.status}`);
                        }
                    }).catch(err => {
                        console.error(`Erro de rede no PUSH de ${gastoId}:`, err.message);
                    })
                );
            }
        }

        // Espera todas as tentativas de PUSH terminarem
        await Promise.all(pushPromises);
        console.log("Etapa PUSH concluída!");


        // --- ETAPA 3 (NOVA ORDEM): "PUXAR" (PULL) DADOS DO SERVIDOR ---
        console.log("Sincronização: Etapa 3 - Puxando (PULL) dados do servidor...");
        const stateVectors = {};
        for (const gastoId of yDocs.keys()) {
            const yDoc = yDocs.get(gastoId);
            if (yDoc.getMap("gasto").get("familia_id") === familiaId) {
                const sv = getYjsStateVector(gastoId) || new Uint8Array();
                stateVectors[gastoId] = Buffer.from(sv).toString("base64");
            }
        }

        const response = await fetch(urlPull, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familiaId, stateVectors }),
        });

        if (!response.ok) {
            throw new Error(`PULL falhou: ${response.status}`);
        }

        const { updates } = await response.json();
        if (updates && Object.keys(updates).length > 0) {
            console.log("Aplicando updates do servidor...");
            for (const [gastoId, updateB64] of Object.entries(updates)) {

                addLocalGastoId(familiaId, gastoId);
                await inicializarYjsParaGasto(gastoId, familiaId);

                if (updateB64) {
                    const updateBuf = new Uint8Array(Buffer.from(updateB64, "base64"));
                    console.log(`Aplicando update do servidor em ${gastoId}`);
                    applyYjsUpdate(gastoId, updateBuf);

                    // Marcar como 'sincronizado' ao receber dados do servidor
                    const yDoc = yDocs.get(gastoId);
                    if (yDoc) {
                        yDoc.getMap("gasto").set("sincronizado", true);
                    }
                }
            }
        } else {
            console.log("Nenhum update recebido do servidor.");
        }
        console.log("Etapa PULL concluída!");

        console.log("Sincronização completa!");

    } catch (error) {
        console.error("Erro GERAL ao sincronizar com o servidor:", error);
    }
}