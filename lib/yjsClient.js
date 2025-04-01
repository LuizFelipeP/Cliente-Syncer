import * as Y from "yjs";

let IndexeddbPersistence;
let yDoc, yGastos, persistence;

// Verifica se está no ambiente de cliente
if (typeof window !== "undefined") {
    // Importa dinamicamente o IndexeddbPersistence só no cliente
    IndexeddbPersistence = require("y-indexeddb").IndexeddbPersistence;

    // Inicializa o Yjs e o IndexeddbPersistence
    yDoc = new Y.Doc();
    yGastos = yDoc.getArray("gastos"); // Utilizando um Y.Array para armazenar os gastos

    // Sincronizando com IndexedDB
    persistence = new IndexeddbPersistence("gastos-sync", yDoc);

    // Observar mudanças no yGastos (exemplo de log)
    yGastos.observe(() => {
        console.log("Mudanças detectadas nos gastos. Pode sincronizar com o servidor.");
    });

    // Registrar o listener de update no yDoc somente no cliente
    if (yDoc) {
        yDoc.on("update", async (update) => {
            try {
                // Converter update para Base64 usando Buffer (certifique-se de que Buffer está disponível ou use um polyfill)
                const updateBase64 = Buffer.from(update).toString("base64");
                console.log("📤 Enviando update para o servidor...");

                const response = await fetch("http://192.168.0.2:3008/api/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ update: updateBase64 }),
                });

                if (!response.ok) {
                    console.error("❌ Erro ao enviar update:", response.status);
                } else {
                    console.log("✅ Update enviado com sucesso!");
                }
            } catch (error) {
                console.error("❌ Erro ao enviar update:", error);
            }
        });
    }
}

// Função para adicionar gasto localmente
export function addGasto(gasto) {
    if (yGastos) {
        yGastos.push([gasto]);
    }
}

// Função para remover gasto localmente
export function removeGasto(id) {
    if (yGastos) {
        const index = yGastos.toArray().findIndex((g) => g.id === id);
        if (index !== -1) yGastos.delete(index, 1);
    }
}

// Função para editar gasto localmente
export function editGasto(id, updatedGasto) {
    if (yGastos) {
        const index = yGastos.toArray().findIndex((g) => g.id === id);
        if (index !== -1) yGastos.delete(index, 1);
        yGastos.push([updatedGasto]);
    }
}

// Função para buscar gastos do IndexedDB
export function getGastos() {
    if (yGastos) {
        return yGastos.toArray();
    }
    return [];
}

// Obter o estado do vetor Yjs para sincronização
export function getYjsStateVector() {
    if (yDoc) {
        return Y.encodeStateVector(yDoc);
    }
    return null;
}

// Aplicar uma atualização recebida do servidor
export function applyYjsUpdate(update) {
    if (yDoc) {
        Y.applyUpdate(yDoc, new Uint8Array(update));
    }
}

export { yDoc, yGastos };
