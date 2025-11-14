"use client";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export const categoriesDoc = new Y.Doc();
let persistence = null;
let isReadyPromise = null;

export const yCategoriesMeta = categoriesDoc.getMap("meta");
export const yRootMap = categoriesDoc.getMap("root-categories");

export function initCategories() {
    if (typeof window !== 'undefined' && !isReadyPromise) {
        console.log("Inicializando persistência das categorias (Y.Array)...");
        persistence = new IndexeddbPersistence("tcc-categorias-array-doc-v2", categoriesDoc);

        categoriesDoc.on('update', (update, origin) => {
            if (origin !== 'sync' && origin !== 'local-meta') {
                categoriesDoc.transact(() => {
                    yCategoriesMeta.set('sincronizado', false);
                }, 'local-meta');
            }
        });

        isReadyPromise = (async () => {
            await persistence.whenSynced;
            console.log("Persistência pronta.");

            if (!yRootMap.has("outros")) {
                console.log("Criando arrays de categorias...");
                categoriesDoc.transact(() => {
                    yRootMap.set("alimentacao", new Y.Array());
                    yRootMap.set("deslocamento", new Y.Array());
                    yRootMap.set("estudo", new Y.Array());
                    yRootMap.set("outros", new Y.Array());
                    yCategoriesMeta.set('sincronizado', false);
                }, 'local-meta');
            }
            return true;
        })();
    }
    return isReadyPromise;
}

async function ensureReady() {
    if (!isReadyPromise) await initCategories();
    await isReadyPromise;
}

function getCategoriaElement(categoriaId) {
    if (!categoriaId) categoriaId = "outros";
    return yRootMap.get(categoriaId);
}

function findGastoLocation(gastoId) {
    const categorias = ["alimentacao", "deslocamento", "estudo", "outros"];
    for (const catId of categorias) {
        const yArray = yRootMap.get(catId);
        if (yArray) {
            let index = 0;
            // MUDANÇA: Os itens são 'Y.Map' com apenas 'gastoId'
            for (const item of yArray) {
                if (item && item.get("gastoId") === gastoId) {
                    return { yArray, index, item, catId };
                }
                index++;
            }
        }
    }
    return { yArray: null, index: -1, item: null, catId: null };
}

// --- Funções de "Escrita" ---

export async function adicionarGastoACategoria(gasto, categoriaId = "outros") {
    await ensureReady();

    const { item } = findGastoLocation(gasto.id);
    if (item) return;

    const targetArray = getCategoriaElement(categoriaId);
    if (targetArray) {
        // MUDANÇA: O ponteiro SÓ armazena o ID
        const novoPonteiro = new Y.Map();
        novoPonteiro.set("gastoId", gasto.id);

        targetArray.push([novoPonteiro]);
        console.log(`(Array) Ponteiro ${gasto.id} adicionado em ${categoriaId}`);
    }
}

export async function moverGastoParaCategoria(gastoId, novaCategoriaId) {
    await ensureReady();

    const { yArray: sourceArray, index, catId: oldCatId, item } = findGastoLocation(gastoId);
    const destArray = getCategoriaElement(novaCategoriaId);

    if (!sourceArray || index === -1) return;
    if (!destArray) return;
    if (oldCatId === novaCategoriaId) return;

    console.log(`(Array) Movendo ${gastoId} de ${oldCatId} para ${novaCategoriaId}...`);

    // MUDANÇA: Clonamos o PONTEIRO (que só tem o ID)
    const ponteiroClone = new Y.Map();
    ponteiroClone.set("gastoId", item.get("gastoId"));

    categoriesDoc.transact(() => {
        sourceArray.delete(index, 1);
        destArray.push([ponteiroClone]);
    });
}

export async function removerGastoDeCategoria(gastoId) {
    await ensureReady();
    const { yArray, index } = findGastoLocation(gastoId);
    if (yArray && index !== -1) {
        yArray.delete(index, 1);
    }
}

// MUDANÇA: Esta função foi REMOVIDA. Não precisamos mais dela.
// export async function atualizarPonteiroGasto(...) {}


// --- Função de "Leitura" ---
export function getEstruturaCategorias(gastosReais = []) {
    const estrutura = {};
    const idsRemovidos = new Set(gastosReais.filter(g => g.removido).map(g => g.id));
    const categorias = ["alimentacao", "deslocamento", "estudo", "outros"];

    if (!yRootMap) return {};

    categorias.forEach(catId => {
        const yArray = yRootMap.get(catId);
        const nomes = { alimentacao: "Alimentação", deslocamento: "Deslocamento", estudo: "Estudo", outros: "Outros" };

        if (yArray) {
            estrutura[catId] = {
                nome: nomes[catId],
                // MUDANÇA: O map agora só retorna o ponteiro (ID + categoriaId)
                gastos: yArray.toArray().map(yItem => ({
                    id: yItem.get("gastoId"),
                    categoriaId: catId
                })).filter(g => g.id && !idsRemovidos.has(g.id))
            };
        } else {
            estrutura[catId] = { nome: nomes[catId], gastos: [] };
        }
    });
    return estrutura;
}