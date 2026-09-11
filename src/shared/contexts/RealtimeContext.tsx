import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_V1_BASE_URL } from "@/lib/env";
import { getAccessToken, getCurrentUser } from "@/features/auth/store";
import { soundEngine } from "@/shared/lib/audio";
import { notify } from "@/shared/lib/notify";
import { getOrderStatusLabel } from "@/shared/lib/order-status";

export type RealtimeEventType =
  | "CONNECTED"
  | "HEARTBEAT"
  | "notification:new"
  | "order:new"
  | "order:status_changed"
  | "order:bill_updated"
  | "booking:new"
  | "booking:status_changed"
  | "support:new_message";

export interface RealtimeMessage<T = any> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
}

type EventCallback = (payload: any) => void;

interface RealtimeContextType {
  isConnected: boolean;
  subscribe: (event: RealtimeEventType, callback: EventCallback) => () => void;
  subscribeToOrder: (orderId: string, callback: EventCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  subscribe: () => () => {},
  subscribeToOrder: () => () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const orderListenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subscribe = useCallback(
    (event: RealtimeEventType, callback: EventCallback) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);

      return () => {
        const set = listenersRef.current.get(event);
        if (set) {
          set.delete(callback);
        }
      };
    },
    [],
  );

  const subscribeToOrder = useCallback(
    (orderId: string, callback: EventCallback) => {
      if (!orderListenersRef.current.has(orderId)) {
        orderListenersRef.current.set(orderId, new Set());
      }
      orderListenersRef.current.get(orderId)!.add(callback);

      return () => {
        const set = orderListenersRef.current.get(orderId);
        if (set) {
          set.delete(callback);
        }
      };
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const connectSSE = () => {
      const token = getAccessToken();
      const user = getCurrentUser();

      if (!token || !user) {
        setIsConnected(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = `${API_V1_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMounted) {
          setIsConnected(true);
          console.debug("[SSE] Connected to realtime stream");
        }
      };

      es.onerror = (err) => {
        if (isMounted) {
          setIsConnected(false);
          console.warn("[SSE] Connection lost, reconnecting in 5s...", err);
          es.close();
          eventSourceRef.current = null;

          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (isMounted && getAccessToken()) {
              connectSSE();
            }
          }, 5000);
        }
      };

      // Handle custom events
      const handleEvent = (type: RealtimeEventType, event: MessageEvent) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          const payload = message.payload;

          // Call registered listeners
          const globalListeners = listenersRef.current.get(type);
          if (globalListeners) {
            globalListeners.forEach((cb) => {
              try {
                cb(payload);
              } catch (e) {
                console.error("[SSE] Listener error:", e);
              }
            });
          }

          // Handle order-specific listeners
          const orderId = payload?.orderId || payload?.id;
          if (orderId && orderListenersRef.current.has(orderId)) {
            const specificListeners = orderListenersRef.current.get(orderId);
            specificListeners?.forEach((cb) => {
              try {
                cb(payload);
              } catch (e) {
                console.error("[SSE] Order listener error:", e);
              }
            });
          }

          // Built-in actions
          if (type === "order:new") {
            const currentUser = getCurrentUser();
            if (currentUser?.Role === "Merchant") {
              soundEngine.playNewOrderSound();
              const shortCode = orderId ? orderId.split("-")[0]?.toUpperCase() : "MỚI";
              notify.success(
                `🔔 Có đơn hàng mới #${shortCode}! ${payload?.name ? `(${payload.name})` : ""}`,
              );
            }
            void queryClient.invalidateQueries({ queryKey: ["merchant-orders"] });
            void queryClient.invalidateQueries({ queryKey: ["merchantOrders"] });
            void queryClient.invalidateQueries({ queryKey: ["orders"] });
          }

          if (type === "order:status_changed") {
            const shortCode = orderId ? orderId.split("-")[0]?.toUpperCase() : "";
            const statusLabel = getOrderStatusLabel(payload?.status);
            const currentUser = getCurrentUser();

            if (currentUser?.Role === "Customer" || currentUser?.Role === "Reviewer") {
              soundEngine.playNotificationSound();
              notify.info(`📦 Đơn hàng #${shortCode}: ${statusLabel}`);
            }

            void queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
            void queryClient.invalidateQueries({ queryKey: ["customerOrders"] });
            void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
            void queryClient.invalidateQueries({ queryKey: ["merchant-orders"] });
          }

          if (type === "notification:new") {
            soundEngine.playNotificationSound();
            if (payload?.title) {
              notify.info(payload.title);
            }
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            void queryClient.invalidateQueries({ queryKey: ["notificationsCount"] });
          }
        } catch (e) {
          console.error("[SSE] Parse message failed:", e);
        }
      };

      const eventTypes: RealtimeEventType[] = [
        "CONNECTED",
        "HEARTBEAT",
        "notification:new",
        "order:new",
        "order:status_changed",
        "order:bill_updated",
        "booking:new",
        "booking:status_changed",
        "support:new_message",
      ];

      eventTypes.forEach((type) => {
        es.addEventListener(type, (e) => handleEvent(type, e as MessageEvent));
      });
    };

    connectSSE();

    // Listen to storage changes to reconnect on login/logout
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === "ugem_access_token") {
        connectSSE();
      }
    };
    window.addEventListener("storage", onStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", onStorageChange);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe, subscribeToOrder }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
