"use client";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { addLocalGastoId, removeLocalGastoId } from "./gastoIdStore";

const yDocs = new Map(); // Mapa de gastoId -> Y.Doc
const persistences = new Map(); // Mapa de gastoId -> IndexeddbPersistence

// Inicializa Yjs para um gasto específico
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

    yDocs.set(gastoId, yDoc);
    persistences.set(gastoId, persistence);

    return persistence.whenSynced;
}

export async function addGasto(gasto) {
    const { id: gastoId, familia_id, descricao } = gasto; // 1. Pegar a descricao

    addLocalGastoId(familia_id, gastoId);
    await inicializarYjsParaGasto(gastoId, familia_id);

    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto"); // 2. Pegar o Y.Map principal

    // 3. Criar o Y.Text para a descrição
    const yDescricao = new Y.Text();
    yDescricao.insert(0, descricao); // Inserir o texto inicial

    // 4. Salvar o Y.Text DENTRO do Y.Map
    yMap.set("descricao", yDescricao);

    // 5. Salvar o resto dos dados (exceto a descrição que já foi)
    Object.entries(gasto).forEach(([key, value]) => {
        if (key !== "descricao") { // Não sobrescrever o Y.Text
            yMap.set(key, value);
        }
    });

    yMap.set("sincronizado", false);
}

// Remove o Y.Doc de um gasto específico (localmente)
export function removeGasto(gastoId) {
    const yDoc = yDocs.get(gastoId);
    if (!yDoc) return;

    const yMap = yDoc.getMap("gasto");

    yMap.set("removido", true);
    yMap.set("sincronizado", false); // Isso já estava correto, mas mantemos

    console.log(`Gasto ${gastoId} marcado como removido`);
}


// Edita um gasto (substitui valores no Y.Map)
export async function editGasto(gastoId, updatedGasto) {
    // Esta função agora SÓ vai atualizar campos que NÃO SÃO 'descricao',
    // porque a 'descricao' (Y.Text) será atualizada AO VIVO pelo binding.

    let familiaId = updatedGasto.familia_id;
    if (!familiaId) {
        const yDoc = yDocs.get(gastoId);
        if (yDoc) {
            familiaId = yDoc.getMap("gasto").get("familia_id");
        } else {
            console.error("editGasto precisa da familia_id ou de um doc existente");
            return;
        }
    }

    await inicializarYjsParaGasto(gastoId, familiaId);

    const yDoc = yDocs.get(gastoId);
    const yMap = yDoc.getMap("gasto");

    Object.entries(updatedGasto).forEach(([key, value]) => {
        // SÓ atualizamos o que não for 'descricao'
        if (key !== "descricao") {
            yMap.set(key, value);
        }
    });

    // A flag de sincronizado será tratada pelo 'sync.js'
    // Mas podemos forçar aqui para outros campos
    if (Object.keys(updatedGasto).some(k => k !== "descricao")) {
        yMap.set("sincronizado", false);
    }
}

// Retorna todos os gastos carregados no momento
export function getGastos() {
    const gastos = [];
    yDocs.forEach((yDoc, gastoId) => {
        const yMap = yDoc.getMap("gasto");
        const obj = Object.fromEntries(yMap.entries());
        if (obj.descricao && typeof obj.descricao.toString === 'function') {
            obj.descricao = obj.descricao.toString();
        }
        gastos.push(obj);
    });
    return gastos;
}

// Estado Yjs de um gasto
export function getYjsStateVector(gastoId) {
    const yDoc = yDocs.get(gastoId);
    return yDoc ? Y.encodeStateVector(yDoc) : null;
}

// 3. MUDANÇA CRUCIAL:
export function applyYjsUpdate(gastoId, update) {
    const yDoc = yDocs.get(gastoId);
    if (yDoc) {
        Y.applyUpdate(yDoc, new Uint8Array(update), 'sync');

        // A lógica de 'set("sincronizado", true)' foi movida
        // para DENTRO do 'sync.js' (tanto no PUSH quanto no PULL).
        // Isso impede que um PULL sobrescreva uma mudança
        // local que estava pendente de PUSH.
    }
}

// Função para pegar o update completo (para PUSH manual)
export function getFullYjsUpdate(gastoId) {
    const yDoc = yDocs.get(gastoId);
    return yDoc ? Y.encodeStateAsUpdate(yDoc) : null;
}

export {yDocs}