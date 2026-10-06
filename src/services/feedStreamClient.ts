type FeedStreamCallback = (event: { action: string; data?: any }) => void;

export class FeedStreamClient {
  private eventSource: EventSource | null = null;
  private subscribers: Set<FeedStreamCallback> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  public subscribe(cb: FeedStreamCallback): () => void {
    this.subscribers.add(cb);
    if (this.subscribers.size === 1) {
      this.connect();
    }
    return () => {
      this.subscribers.delete(cb);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  public connect() {
    if (this.eventSource || this.isConnecting) return;

    const token = localStorage.getItem('smw_auth_token') || localStorage.getItem('token');
    if (!token) return;

    this.isConnecting = true;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const streamUrl = `${apiBaseUrl}/feed/stream?token=${encodeURIComponent(token)}`;

      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      es.addEventListener('feed_state_change', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.notifySubscribers({ action: parsed.action || 'feed_state_change', data: parsed });
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      });

      es.addEventListener('notification_created', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.notifySubscribers({ action: parsed.action || 'notification:new', data: parsed });
        } catch (err) {
          console.error('Error parsing notification_created SSE:', err);
        }
      });

      es.addEventListener('notification_updated', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.notifySubscribers({ action: parsed.action || 'notification:updated', data: parsed });
        } catch (err) {
          console.error('Error parsing notification_updated SSE:', err);
        }
      });

      es.addEventListener('connected', () => {
        this.isConnecting = false;
      });

      es.onerror = () => {
        this.disconnect();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.subscribers.size === 0) return;

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private notifySubscribers(event: { action: string; data?: any }) {
    for (const cb of this.subscribers) {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in feed stream subscriber callback:', err);
      }
    }
  }
}

export const feedStreamClient = new FeedStreamClient();
