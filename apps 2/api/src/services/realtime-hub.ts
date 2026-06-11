import type { Server } from "node:http";
import { WebSocketServer } from "ws";

interface MessageEnvelope<T> {
  type: string;
  payload: T;
  sentAt: string;
}

export class RealtimeHub {
  private server: WebSocketServer | null = null;

  attach(httpServer: Server): void {
    this.server = new WebSocketServer({ server: httpServer, path: "/ws" });

    this.server.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          type: "connection",
          payload: { ok: true },
          sentAt: new Date().toISOString()
        })
      );
    });
  }

  broadcast<T>(type: string, payload: T): void {
    if (!this.server) {
      return;
    }

    const envelope: MessageEnvelope<T> = {
      type,
      payload,
      sentAt: new Date().toISOString()
    };

    const raw = JSON.stringify(envelope);

    for (const client of this.server.clients) {
      if (client.readyState === client.OPEN) {
        client.send(raw);
      }
    }
  }
}
