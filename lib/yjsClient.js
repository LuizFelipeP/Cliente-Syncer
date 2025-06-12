"use client";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

const yDocs = new Map(); // Mapa de gastoId -> Y.Doc
const persistences = new Map(); // Mapa de gastoId -> IndexeddbPersistence

// Inicializa Yjs para um gasto específico
export async function inicializarYjsParaGasto(gastoId, familiaId) {
    if (typeof window === "undefined" || !gastoId || !familiaId) return;


    if (yDocs.has(gastoId)) return;

    const yDoc = new Y.Doc();
    const yMap = yDoc.getMap("gasto");
    const persistence = new IndexeddbPersistence(
        `gasto-sync-${familiaId}-${gastoId}`,
        yDoc
    );


    yMap.observe(() => {
        console.log(`Mudanças no gasto ${gastoId}`);
    });

    const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
    const host = process.env.NEXT_PUBLIC_API_HOST;
    const port = process.env.NEXT_PUBLIC_API_PORT;

    const url = `${protocolo}://${host}:${port}/api/sincronizar`;

    yDoc.on("update", async (update) => {
        try {
            const updateBase64 = Buffer.from(update).toString("base64");
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gastoId,
                    familiaId,
                    update: updateBase64,
                }),
            });
            console.log(
                `Update enviado para o gasto ${gastoId} da família ${familiaId}`
            );
        } catch (error) {

            console.error(
                `Erro ao enviar update do gasto ${gastoId}:`,
                error
            );
            const yDoc = yDocs.get(gastoId);
            const yMap = yDoc.getMap("gasto");
            yMap.set("sincronizado", false); // marca sincronizado
        }
    });

    yDocs.set(gastoId, yDoc);
    persistences.set(gastoId, persistence);
}

// Adiciona ou atualiza um gasto
export async function addGasto(gasto) {
    const { id: gastoId, familia_id } = gasto;
    await inicializarYjsParaGasto(gastoId, familia_id);

    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto");

    Object.entries(gasto).forEach(([key, value]) => {
        yMap.set(key, value);
    });
}

// Remove o Y.Doc de um gasto específico (localmente)
export function removeGasto(gastoId) {
    const yDoc = yDocs.get(gastoId);
    if (!yDoc) return;

    const yMap = yDoc.getMap("gasto");
    yMap.set("removido", true); // marca como removido

    console.log(`Gasto ${gastoId} marcado como removido`);
}


// Edita um gasto (substitui valores no Y.Map)
export async function editGasto(gastoId, updatedGasto) {
    await inicializarYjsParaGasto(gastoId);

    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto");

    Object.entries(updatedGasto).forEach(([key, value]) => {
        yMap.set(key, value);
    });
}

// Retorna todos os gastos carregados no momento
export function getGastos() {
    const gastos = [];
    yDocs.forEach((yDoc, gastoId) => {
        const yMap = yDoc.getMap("gasto");
        const obj = Object.fromEntries(yMap.entries());
        gastos.push(obj);
    });
    return gastos;
}

// Estado Yjs de um gasto
export function getYjsStateVector(gastoId) {
    const yDoc = yDocs.get(gastoId);
    return yDoc ? Y.encodeStateVector(yDoc) : null;
}

// Aplica update para um gasto
export function applyYjsUpdate(gastoId, update) {
    const yDoc = yDocs.get(gastoId);
    if (yDoc) {
        Y.applyUpdate(yDoc, new Uint8Array(update));
        const yMap = yDoc.getMap("gasto");
        yMap.set("sincronizado", true); // marca sincronizado
    }
}

export {yDocs}