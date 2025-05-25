import {
    inicializarYjsParaGasto,
    getYjsStateVector,
    applyYjsUpdate,
    yDocs,
} from "./yjsClient";


export async function sincronizarComServidor(familiaId) {
    try {
        //Monta o stateVectors para todos os docs já inicializados
        const stateVectors = {};
        for (const gastoId of yDocs.keys()) {
            const sv = getYjsStateVector(gastoId) || new Uint8Array();
            stateVectors[gastoId] = Buffer.from(sv).toString("base64");
        }

        const protocolo = process.env.NEXT_PUBLIC_API_PROTOCOL;
        const host = process.env.NEXT_PUBLIC_API_HOST;
        const port = process.env.NEXT_PUBLIC_API_PORT;

        const url = `${protocolo}://${host}:${port}/api/sync`;

        //Envia tudo num único fetch
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ familiaId, stateVectors }),
        });
        if (!response.ok) {
            const yDoc = yDocs.get(gastoId);
            const yMap = yDoc.getMap("gasto");
            yMap.set("sincronizado", false); // marca sincronizado
            throw new Error(`Sync falhou: ${response.status}`);
        }

        const { updates } = await response.json();
        if (!updates) {
            console.log("Nenhum update retornado");
            return;
        }

        //Para cada update retornado, inicializa e aplicar
        for (const [gastoId, updateB64] of Object.entries(updates)) {
            //Inicializa o Y.Doc (vazio) caso ainda não exista
            if (!yDocs.has(gastoId)) {
                await inicializarYjsParaGasto(gastoId, familiaId);
            }

            //Se veio update, aplica no doc certo
            if (updateB64) {
                const updateBuf = new Uint8Array(Buffer.from(updateB64, "base64"));
                console.log(`Aplicando update em ${gastoId}`, updateBuf);
                applyYjsUpdate(gastoId, updateBuf);
            }
        }

        console.log("Sincronização bulk concluída!");
    } catch (error) {
        console.error("Erro ao sincronizar com o servidor:", error);

        for (const gastoId of yDocs.keys()) {
            const yDoc = yDocs.get(gastoId);
            const yMap = yDoc.getMap("gasto");
            yMap.set("sincronizado", false);
        }

    }
}
