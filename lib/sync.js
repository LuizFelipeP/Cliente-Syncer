import * as Y from "yjs";
import {
    inicializarYjsParaGasto,
    getYjsStateVector,
    applyYjsUpdate,
    getFullYjsUpdate,
    yDocs,
} from "./yjsClient";
import { getLocalGastoIds, addLocalGastoId } from "./gastoIdStore";

// NOVO: Importar as categorias e seus metadados
import { categoriesDoc, yCategoriesMeta } from "./yjsCategorias";

// ID Fixo para identificar o documento de categorias no banco
const CATEGORIES_DOC_ID = "categories-global";

export async function sincronizarComServidor(familiaId) {
    if (!familiaId) {
        console.error("sincronizarComServidor chamado sem familiaId");
        return;
    }

    const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
    const host = process.env.NEXT_PUBLIC_API_HOST;
    const port = process.env.NEXT_PUBLIC_API_PORT;
    const urlPull = `${protocolo}://${host}:${port}/api/sincronizarStateVector`;
    const urlPush = `${protocolo}://${host}:${port}/api/sincronizar`;

    try {
        // --- ETAPA 1: "ACORDAR" DOCS LOCAIS ---
        console.log("Sincronização: Etapa 1 - Acordando docs locais...");
        const localGastoIds = getLocalGastoIds(familiaId);
        const initPromises = localGastoIds.map(id => inicializarYjsParaGasto(id, familiaId));
        await Promise.all(initPromises);
        console.log("Docs locais carregados.");


        // --- ETAPA 2: "PUSH" DE DADOS LOCAIS ---
        console.log("Sincronização: Etapa 2 - Enviando (PUSH)...");
        const pushPromises = [];

        // 2a. Push dos GASTOS NORMAIS
        for (const [gastoId, yDoc] of yDocs.entries()) {
            const yMap = yDoc.getMap("gasto");
            if (yMap.get("sincronizado") === false && yMap.get("familia_id") === familiaId) {
                console.log(`PUSH Gasto: ${gastoId}`);
                const fullUpdate = getFullYjsUpdate(gastoId);
                if (!fullUpdate) continue;

                pushPromises.push(
                    enviarPush(urlPush, gastoId, familiaId, fullUpdate)
                        .then(ok => { if (ok) yMap.set("sincronizado", true); })
                );
            }
        }

        // 2b. Push das CATEGORIAS (Novo!)
        // Verifica se a flag 'sincronizado' do meta está false
        if (yCategoriesMeta.get("sincronizado") === false) {
            console.log(`PUSH Categorias...`);
            // Pega o update do documento inteiro de categorias
            const catUpdate = Y.encodeStateAsUpdate(categoriesDoc);

            pushPromises.push(
                enviarPush(urlPush, CATEGORIES_DOC_ID, familiaId, catUpdate)
                    .then(ok => { if (ok) yCategoriesMeta.set("sincronizado", true); })
            );
        }

        await Promise.all(pushPromises);
        console.log("Etapa PUSH concluída!");


        // --- ETAPA 3: "PUXAR" (PULL) DADOS DO SERVIDOR ---
        console.log("Sincronização: Etapa 3 - Puxando (PULL)...");
        const stateVectors = {};

        // 3a. Vectors dos Gastos
        for (const gastoId of yDocs.keys()) {
            const yDoc = yDocs.get(gastoId);
            if (yDoc.getMap("gasto").get("familia_id") === familiaId) {
                const sv = getYjsStateVector(gastoId) || new Uint8Array();
                stateVectors[gastoId] = Buffer.from(sv).toString("base64");
            }
        }

        // 3b. Vector das Categorias (Novo!)
        // Dizemos ao servidor o que JÁ temos das categorias
        const catSv = Y.encodeStateVector(categoriesDoc);
        stateVectors[CATEGORIES_DOC_ID] = Buffer.from(catSv).toString("base64");

        const response = await fetch(urlPull, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familiaId, stateVectors }),
        });

        if (!response.ok) throw new Error(`PULL falhou: ${response.status}`);

        const { updates } = await response.json();

        if (updates && Object.keys(updates).length > 0) {
            console.log("Aplicando updates do servidor...");

            for (const [docId, updateB64] of Object.entries(updates)) {
                if (!updateB64) continue;
                const updateBuf = new Uint8Array(Buffer.from(updateB64, "base64"));

                // 3c. Aplicar Update: Verificar se é Categoria ou Gasto
                if (docId === CATEGORIES_DOC_ID) {
                    console.log("Aplicando update em Categorias");
                    // 'sync' como origem impede que a gente marque como 'não sincronizado' de novo
                    Y.applyUpdate(categoriesDoc, updateBuf, 'sync');
                    yCategoriesMeta.set("sincronizado", true);
                } else {
                    // É um gasto normal
                    addLocalGastoId(familiaId, docId);
                    await inicializarYjsParaGasto(docId, familiaId);
                    applyYjsUpdate(docId, updateBuf);
                    // Marca como sincronizado
                    const yDoc = yDocs.get(docId);
                    if (yDoc) yDoc.getMap("gasto").set("sincronizado", true);
                }
            }
        }
        console.log("Etapa PULL concluída! Sincronização Completa.");

    } catch (error) {
        console.error("Erro GERAL ao sincronizar:", error);
    }
}

// Função auxiliar para não repetir código de fetch
async function enviarPush(url, docId, familiaId, updateInfo) {
    try {
        const updateBase64 = Buffer.from(updateInfo).toString("base64");
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gastoId: docId, // A API usa 'gastoId' como chave genérica
                familiaId,
                update: updateBase64,
            }),
        });
        return res.ok;
    } catch (e) {
        console.error(`Falha rede push ${docId}`, e);
        return false;
    }
}