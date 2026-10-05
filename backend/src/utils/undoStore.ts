export interface UndoEntry {
  id: string;
  userId: string;
  action: 'mark_read' | 'save' | 'unsave' | 'restore' | 'caught_up';
  eventIds: string[];
  previousState?: {
    previousSessionAt?: Date | null;
    previousLastSeenAt?: Date | null;
    wasReadIds?: string[];
    wasSavedIds?: string[];
  };
  createdAt: number;
  expiresAt: number;
}

class UndoStore {
  private store = new Map<string, UndoEntry>();
  private readonly DEFAULT_TTL_MS = 15000; // 15 seconds TTL

  constructor() {
    // Periodic cleanup of expired tokens every 30 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.store.entries()) {
        if (entry.expiresAt <= now) {
          this.store.delete(id);
        }
      }
    }, 30000);
  }

  createUndoToken(
    userId: string,
    action: UndoEntry['action'],
    eventIds: string[],
    previousState?: UndoEntry['previousState'],
    ttlMs?: number
  ): string {
    const id = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const expiresAt = now + (ttlMs || this.DEFAULT_TTL_MS);

    this.store.set(id, {
      id,
      userId,
      action,
      eventIds,
      previousState,
      createdAt: now,
      expiresAt,
    });

    return id;
  }

  getUndoEntry(token: string, userId: string): UndoEntry | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (entry.userId !== userId) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(token);
      return null;
    }
    return entry;
  }

  consumeUndoToken(token: string, userId: string): UndoEntry | null {
    const entry = this.getUndoEntry(token, userId);
    if (entry) {
      this.store.delete(token);
    }
    return entry;
  }
}

export const undoStore = new UndoStore();
