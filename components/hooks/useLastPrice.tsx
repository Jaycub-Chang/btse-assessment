import { SafeJSON } from "@/utils";
import { useState, useEffect } from "react";

interface ITradeHistoryApiItem {
  price: number;
  side: "BUY" | "SELL";
  size: number;
  symbol: string;
  timestamp: number;
  tradeId: number;
}

interface ITradeHistoryApiData {
  topic: string;
  data: ITradeHistoryApiItem[];
}

const useLastPrice = () => {
  const [lastPriceInfo, setLastPriceInfo] = useState<{
    previous?: number;
    latest?: number;
  }>({
    previous: undefined,
    latest: undefined,
  });

  useEffect(() => {
    const ws = new WebSocket("wss://ws.btse.com/ws/futures");
    ws.onopen = () => {
      // 訂閱 tradeHistoryApi:BTCPFC
      const subscribeMessage = {
        op: "subscribe",
        args: ["tradeHistoryApi:BTCPFC"],
      };
      ws.send(JSON.stringify(subscribeMessage));
    };
    ws.onmessage = (event) => {
      const result: ITradeHistoryApiData = SafeJSON.parse(event.data);
      setLastPriceInfo((pre) => ({
        latest: result.data?.[0].price,
        previous:
          pre.previous === undefined ? result.data?.[1].price : pre.latest,
      }));
    };

    return () => {
      const unsubscribeMessage = {
        op: "unsubscribe",
        args: ["tradeHistoryApi:BTCPFC"],
      };
      ws.send(JSON.stringify(unsubscribeMessage));
    };
  }, []);

  return { lastPriceInfo };
};

export default useLastPrice;
