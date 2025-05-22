import {
    inicializarYjsParaGasto,
    getYjsStateVector,
    applyYjsUpdate,
    yDocs, // Map<gastoId, Y.Doc>
} from "./yjsClient";

/**
 * Bulk‐sync usando apenas /api/sync, mas garantindo que cada
 * gastoId seja inicializado antes de aplicar seus updates.
 */
export async function sincronizarComServidor(familiaId) {
    try {
        // 1) Monta o stateVectors para TODOS os docs já inicializados
        const stateVectors = {};
        for (const gastoId of yDocs.keys()) {
            const sv = getYjsStateVector(gastoId) || new Uint8Array();
            stateVectors[gastoId] = Buffer.from(sv).toString("base64");
        }

        // 2) Envia tudo num único fetch
        const response = await fetch("http://192.168.0.3:3008/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familiaId, stateVectors }),
        });
        if (!response.ok) {
            throw new Error(`Sync falhou: ${response.status}`);
        }

        const { updates } = await response.json();
        if (!updates) {
            console.log("🔄 Nenhum update retornado");
            return;
        }

        // 3) Para cada update retornado, garantir inicialização e aplicar
        for (const [gastoId, updateB64] of Object.entries(updates)) {
            // 3.1) Inicializa o Y.Doc (vazio) caso ainda não exista
            if (!yDocs.has(gastoId)) {
                await inicializarYjsParaGasto(gastoId, familiaId);
            }

            // 3.2) Se veio update, aplica no doc certo
            if (updateB64) {
                const updateBuf = new Uint8Array(Buffer.from(updateB64, "base64"));
                console.log(`🔄 Aplicando update em ${gastoId}`, updateBuf);
                applyYjsUpdate(gastoId, updateBuf);
            }
        }

        console.log("✅ Sincronização bulk concluída!");
    } catch (error) {
        console.error("❌ Erro ao sincronizar com o servidor:", error);
    }
}
