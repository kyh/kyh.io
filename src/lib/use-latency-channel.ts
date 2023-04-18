import { useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";

type UseLatencyChannelProps = {
  userId: string;
  interval?: number;
};

export const useLatencyChannel = ({
  userId,
  interval = 1000,
}: UseLatencyChannelProps) => {
  const [latency, setLatency] = useState<number | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    let pingIntervalId: ReturnType<typeof setInterval> | undefined;

    const pingChannel = supabase.channel(`ping:${userId}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    pingChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        pingIntervalId = setInterval(async () => {
          const start = performance.now();

          const resp = await pingChannel.send({
            type: "broadcast",
            event: "ping",
            payload: {},
          });

          if (resp !== "ok") {
            console.log("pingChannel broadcast error");
            setLatency(-1);
          } else {
            const end = performance.now();
            const newLatency = end - start;

            setLatency(newLatency);
          }
        }, interval);
      }
    });

    return () => {
      clearInterval(pingIntervalId);
      supabase.removeChannel(pingChannel);
    };
  }, []);

  return latency;
};
