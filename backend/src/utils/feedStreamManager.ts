import { Response } from 'express';

interface StreamClient {
  res: Response;
  userId: string;
  connectedAt: Date;
}

export class FeedStreamManager {
  private clients: Map<string, Set<Response>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
  }

  public addClient(userId: string, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    // Initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', userId, timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  public removeClient(userId: string, res: Response) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  public broadcastToUser(userId: string, eventName: string, data: any) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userClients) {
      try {
        res.write(payload);
      } catch (err) {
        // Client connection broken
        this.removeClient(userId, res);
      }
    }
  }

  public broadcastToAll(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [userId, userClients] of this.clients.entries()) {
      for (const res of userClients) {
        try {
          res.write(payload);
        } catch {
          this.removeClient(userId, res);
        }
      }
    }
  }

  private broadcastHeartbeat() {
    for (const [userId, userClients] of this.clients.entries()) {
      for (const res of userClients) {
        try {
          res.write(`: heartbeat\n\n`);
        } catch {
          this.removeClient(userId, res);
        }
      }
    }
  }

  public getConnectedUserCount(): number {
    return this.clients.size;
  }
}

export const feedStreamManager = new FeedStreamManager();
