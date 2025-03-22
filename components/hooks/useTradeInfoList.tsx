import { SafeJSON } from "@/utils";
import { useEffect, useMemo, useState } from "react";

interface IUpdateTradeData {
  data: {
    // price, size
    asks: [string, string][];
    bids: [string, string][];
    prevSeqNum: number;
    seqNum: number;
    timestamp: number;
    symbol: string;
    type: "snapshot" | "delta";
  };
  topic: string;
}

interface ITradeInfoList {
  latest: {
    asks: [string, string][];
    bids: [string, string][];
  };
  previous: {
    asks: [string, string][];
    bids: [string, string][];
  };
}

const useTradeInfoList = () => {
  const [tradeInfoList, setTradeInfoList] = useState<ITradeInfoList>({
    latest: {
      asks: [],
      bids: [],
    },
    previous: {
      asks: [],
      bids: [],
    },
  });

  const handleInitTradeInfoList = (result: IUpdateTradeData) => {
    const initAsks = result.data.asks.slice(0, 8);
    const initBids = result.data.bids.slice(0, 8);
    const newData = {
      asks: initAsks,
      bids: initBids,
    };
    setTradeInfoList({ latest: newData, previous: newData });
  };

  const handleUpdateTradeInfoList = (result: IUpdateTradeData) => {
    setTradeInfoList((prev) => {
      const currentInfoAsksObj = Object.fromEntries(prev.latest.asks);
      const currentInfoBidsObj = Object.fromEntries(prev.latest.bids);

      result.data.asks.forEach(([price, size]) => {
        if (Number(size) === 0) {
          delete currentInfoAsksObj[price];
        } else {
          currentInfoAsksObj[price] = size;
        }
      });

      result.data.bids.forEach(([price, size]) => {
        if (Number(size) === 0) {
          delete currentInfoBidsObj[price];
        } else {
          currentInfoBidsObj[price] = size;
        }
      });

      const newAsks = Object.entries(currentInfoAsksObj)
        .sort(([aPrice], [bPrice]) => {
          return Number(bPrice) - Number(aPrice);
        })
        .slice(0, 8);
      const newBids = Object.entries(currentInfoBidsObj)
        .sort(([aPrice], [bPrice]) => {
          return Number(bPrice) - Number(aPrice);
        })
        .slice(0, 8);

      const newData = {
        asks: newAsks,
        bids: newBids,
      };
      return {
        latest: newData,
        previous: prev.latest,
      };
    });
  };

  useEffect(() => {
    const ws = new WebSocket("wss://ws.btse.com/ws/oss/futures");
    ws.onopen = () => {
      // 訂閱 update:BTCPFC
      const subscribeMessage = {
        op: "subscribe",
        args: ["update:BTCPFC"],
      };
      ws.send(JSON.stringify(subscribeMessage));
    };
    ws.onmessage = (event) => {
      const result: IUpdateTradeData = SafeJSON.parse(event.data);
      if (result.data?.type === "snapshot") {
        handleInitTradeInfoList(result);
      }
      if (result.data?.type === "delta") {
        handleUpdateTradeInfoList(result);
      }
    };

    return () => {
      const unsubscribeMessage = {
        op: "unsubscribe",
        args: ["update:BTCPFC"],
      };
      ws.send(JSON.stringify(unsubscribeMessage));
    };
  }, []);

  return  useMemo(()=>({ tradeInfoList }),[tradeInfoList]);
};

export default useTradeInfoList;
