"use client";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { addLocalGastoId, removeLocalGastoId } from "./gastoIdStore";

// MUDANÇA: Não importamos mais 'atualizarPonteiroGasto'
import {
    adicionarGastoACategoria,
    removerGastoDeCategoria
} from "./yjsCategorias";

const yDocs = new Map();
const persistences = new Map();

export async function inicializarYjsParaGasto(gastoId, familiaId) {
    if (typeof window === "undefined" || !gastoId || !familiaId) return;
    if (yDocs.has(gastoId)) {
        return persistences.get(gastoId).whenSynced;
    }
    const yDoc = new Y.Doc();
    const persistence = new IndexeddbPersistence(
        `gasto-sync-${familiaId}-${gastoId}`,
        yDoc
    );

    persistence.whenSynced.then(() => {
        const yMap = yDoc.getMap("gasto");
        const descricao = yMap.get("descricao");
        if (descricao && typeof descricao === 'string') {
            console.warn(`MIGRANDO GASTO ANTIGO: ${gastoId} (String -> Y.Text)`);
            const oldText = descricao;
            const newYText = new Y.Text();
            newYText.insert(0, oldText);
            yMap.set("descricao", newYText);
        }
    });

    yDocs.set(gastoId, yDoc);
    persistences.set(gastoId, persistence);
    return persistence.whenSynced;
}


export async function addGasto(gasto) {
    const { id: gastoId, familia_id, descricao } = gasto;

    addLocalGastoId(familia_id, gastoId);
    await inicializarYjsParaGasto(gastoId, familia_id);

    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto");

    const yDescricao = new Y.Text();
    yDescricao.insert(0, descricao);
    yMap.set("descricao", yDescricao);

    Object.entries(gasto).forEach(([key, value]) => {
        if (key !== "descricao") {
            yMap.set(key, value);
        }
    });
    yMap.set("sincronizado", false);

    // MUDANÇA: A 'adicionarGastoACategoria' agora só precisa do objeto 'gasto'
    await adicionarGastoACategoria(gasto, "outros");
}

export async function removeGasto(gastoId) {
    const yDoc = yDocs.get(gastoId);
    if (!yDoc) return;
    const yMap = yDoc.getMap("gasto");
    yMap.set("removido", true);
    yMap.set("sincronizado", false);

    await removerGastoDeCategoria(gastoId);

    console.log(`Gasto ${gastoId} marcado como removido`);
}

export async function editGasto(gastoId, updatedGasto) {
    let familiaId = updatedGasto.familia_id;
    if (!familiaId) {
        const yDoc = yDocs.get(gastoId);
        if (yDoc) {
            familiaId = yDoc.getMap("gasto").get("familia_id");
        } else {
            console.error("editGasto precisa da familia_id");
            return;
        }
    }
    await inicializarYjsParaGasto(gastoId, familiaId);
    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto");

    Object.entries(updatedGasto).forEach(([key, value]) => {
        if (key !== "descricao") {
            yMap.set(key, value);
        }
    });

    if (Object.keys(updatedGasto).some(k => k !== "descricao")) {
        yMap.set("sincronizado", false);

        // MUDANÇA: A chamada para 'atualizarPonteiroGasto' foi REMOVIDA.
        // O valor é atualizado no 'refreshUI' do dashboard.
    }
}

// ... (getGastos e o resto permanecem iguais) ...
export function getGastos() {
    const gastos = [];
    yDocs.forEach((yDoc, gastoId) => {
        const yMap = yDoc.getMap("gasto");
        const obj = Object.fromEntries(yMap.entries());
        // AQUI ESTÁ A FONTE DA VERDADE:
        // O 'Y.Text' é convertido para string
        if (obj.descricao && typeof obj.descricao.toString === 'function') {
            obj.descricao = obj.descricao.toString();
        }
        gastos.push(obj);
    });
    return gastos;
}

export function getYjsStateVector(gastoId) {
    const yDoc = yDocs.get(gastoId);
    return yDoc ? Y.encodeStateVector(yDoc) : null;
}

export function applyYjsUpdate(gastoId, update) {
    const yDoc = yDocs.get(gastoId);
    if (yDoc) {
        Y.applyUpdate(yDoc, new Uint8Array(update), 'sync');
    }
}

export function getFullYjsUpdate(gastoId) {
    const yDoc = yDocs.get(gastoId);
    return yDoc ? Y.encodeStateAsUpdate(yDoc) : null;
}

export {yDocs}