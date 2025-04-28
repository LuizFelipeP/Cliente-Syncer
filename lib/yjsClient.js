"use client";
import * as Y from "yjs";

let IndexeddbPersistence;
let yDoc = null;
let yGastos = null;
let persistence = null;

// Inicializar Yjs dinamicamente para a familia
export async function inicializarYjs(familiaId) {
    if (typeof window === "undefined" || !familiaId) return;

    if (!IndexeddbPersistence) {
        IndexeddbPersistence = require("y-indexeddb").IndexeddbPersistence;
    }

    yDoc = new Y.Doc();
    yGastos = yDoc.getArray("gastos");

    persistence = new IndexeddbPersistence(`gastos-sync-${familiaId}`, yDoc);

    yGastos.observe(() => {
        console.log("Mudanças detectadas nos gastos.");
    });

    yDoc.on("update", async (update) => {
        try {
            const updateBase64 = Buffer.from(update).toString("base64");
            await fetch("http://192.168.0.2:3008/api/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ update: updateBase64, familiaId }),
            });
            console.log("✅ Update enviado!");
        } catch (error) {
            console.error("❌ Erro ao enviar update:", error);
        }
    });
}

// funções auxiliares
export function addGasto(gasto) {
    if (yGastos) yGastos.push([gasto]);
}

export function removeGasto(id) {
    if (yGastos) {
        const index = yGastos.toArray().findIndex((g) => g.id === id);
        if (index !== -1) yGastos.delete(index, 1);
    }
}

export function editGasto(id, updatedGasto) {
    if (yGastos) {
        const index = yGastos.toArray().findIndex((g) => g.id === id);
        if (index !== -1) yGastos.delete(index, 1);
        yGastos.push([updatedGasto]);
    }
}

export function getGastos() {
    return yGastos ? yGastos.toArray() : [];
}

export function getYjsStateVector() {
    return yDoc ? Y.encodeStateVector(yDoc) : null;
}

export function applyYjsUpdate(update) {
    if (yDoc) {
        Y.applyUpdate(yDoc, new Uint8Array(update));
    }
}

export { yDoc, yGastos };
