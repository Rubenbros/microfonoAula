/**
 * Broker MQTT integrado usando Aedes
 * Alternativa a Mosquitto — no necesita Docker ni instalacion.
 * Se arranca automaticamente con el backend si no hay broker externo.
 */

const aedes = require("aedes")();
const { createServer } = require("net");

const PORT = parseInt(process.env.MQTT_INTERNAL_PORT || "1883");

const server = createServer(aedes.handle);

server.listen(PORT, () => {
    console.log(`[BROKER] MQTT broker integrado en puerto ${PORT}`);
});

aedes.on("client", (client) => {
    console.log(`[BROKER] Cliente conectado: ${client.id}`);
});

aedes.on("clientDisconnect", (client) => {
    console.log(`[BROKER] Cliente desconectado: ${client.id}`);
});

aedes.on("publish", (packet, client) => {
    if (client && packet.topic.startsWith("aulas/")) {
        console.log(`[BROKER] ${packet.topic}: ${packet.payload.toString().substring(0, 80)}`);
    }
});

module.exports = { aedes, server };
