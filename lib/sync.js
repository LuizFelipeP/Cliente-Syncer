import { getYjsStateVector, applyYjsUpdate, yDoc } from "./yjsClient";
import * as Y from "yjs";

export async function sincronizarComServidor(familiaId) {
    try {
        const stateVector = Y.encodeStateVector(yDoc);
        if (!stateVector || stateVector.length === 0) {
            console.error("⚠️ Erro: stateVector está vazio!");
            return;
        }
        const stateVectorBase64 = Buffer.from(stateVector).toString("base64");
        console.log("📤 Enviando stateVector Base64:", stateVectorBase64);

        const response = await fetch("http://192.168.0.2:3008/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stateVector: stateVectorBase64, familiaId: familiaId}),
        });

        if (!response.ok) throw new Error("Erro ao sincronizar");

        const { update } = await response.json();

        if (update) {
            const updateBuffer = new Uint8Array(Buffer.from(update, "base64"));
            console.log("🔄 Aplicando update recebido:", updateBuffer);
            applyYjsUpdate(updateBuffer);
            console.log("✅ Sincronização concluída!");
        } else {
            console.log("🔄 Nenhuma atualização necessária.");
        }
    } catch (error) {
        console.error("Erro ao sincronizar com o servidor:", error);
    }
}
