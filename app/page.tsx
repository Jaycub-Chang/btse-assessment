"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { SafeJSON } from "@/utils";
import { toAmount } from "@/utils/numberUtil";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import classNames from "classnames";
import useLastPrice from "@/components/hooks/useLastPrice";

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
    // Record<price, size>
    asks: Record<string, string>;
    bids: Record<string, string>;
  };
  previous: {
    asks: Record<string, string>;
    bids: Record<string, string>;
  };
}

interface IDisplayTradeInfoList {
  latest: {
    // price, size, total
    asks: [string, string, string][];
    bids: [string, string, string][];
  };
  previous: {
    asks: Record<string, string>;
    bids: Record<string, string>;
  };
}

const calculateTotal = (
  values: [string, string][]
): [string, string, string][] => {
  let currentTotal = 0;
  return values.map((v) => {
    currentTotal = (currentTotal) + Number(v[1]);
    return [v[0], v[1], currentTotal.toString()];
  });
};

const Home: React.FC = () => {
  const [tradeInfoList, setTradeInfoList] = useState<ITradeInfoList>({
    latest: { asks: {}, bids: {} },
    previous: { asks: {}, bids: {} },
  });

  const handleInitTradeInfoList = (result: IUpdateTradeData) => {
    const initAsks = Object.fromEntries(result.data.asks);
    const initBids = Object.fromEntries(result.data.bids);
    setTradeInfoList({
      latest: { asks: initAsks, bids: initBids },
      previous: { asks: initAsks, bids: initBids },
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
      if (result.data.type === "snapshot") {
        handleInitTradeInfoList(result);
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

  const formattedDisplayTradeInfoList = useMemo<IDisplayTradeInfoList>(() => {
    const latestAsksArray = Object.entries(tradeInfoList.latest.asks).slice(
      0,
      8
    ).reverse();
    const latestBidsArray = Object.entries(tradeInfoList.latest.bids).slice(
      0,
      8
    );
    return {
      latest: {
        asks: calculateTotal(latestAsksArray).reverse(),
        bids: calculateTotal(latestBidsArray),
      },
      previous: tradeInfoList.previous,
    };
  }, [tradeInfoList]);


  // lastPrice
  const { lastPriceInfo } = useLastPrice();
  const hasSetLatestPrice = lastPriceInfo.latest !== undefined;
  const isLatestPriceHigher =
    Number(lastPriceInfo.latest) > Number(lastPriceInfo.previous);
  const isLatestPriceEqual =
    Number(lastPriceInfo.latest) === Number(lastPriceInfo.previous);
  const isLatestPriceLower =
    Number(lastPriceInfo.latest) < Number(lastPriceInfo.previous);

  return (
    <div className={styles.wrapper}>
      <div className={styles.pricePanelWrapper}>
        <div className={styles.bookTitle}>{"Order Book"}</div>
        <div>
          <div className={styles.subTitleWrapper}>
            <div className={styles.priceCell}>{"Price (USD)"}</div>
            <div className={classNames(styles.textEnd, styles.sizeCell)}>
              {"Size"}
            </div>
            <div className={classNames(styles.textEnd, styles.totalCell)}>
              {"Total"}
            </div>
          </div>
          {formattedDisplayTradeInfoList.latest.asks.map((v) => {
            const itemPrice = v[0];
            const itemSize = v[1];
            const total = v[2];
            return (
              <div
                key={`asks_${itemPrice}_${itemSize}`}
                className={styles.tradeInfoWrapper}
              >
                <div className={classNames(styles.priceCell, styles.sellColor)}>
                  {toAmount({ value: itemPrice ,isFixed:true})}
                </div>
                <div className={classNames(styles.textEnd, styles.sizeCell)}>
                  {toAmount({ value: itemSize })}
                </div>
                <div className={classNames(styles.textEnd, styles.totalCell)}>
                  {toAmount({ value: total })}
                </div>
              </div>
            );
          })}
        </div>
        <div
          className={classNames(
            styles.latestPriceCell,
            isLatestPriceHigher && styles.priceHigher,
            isLatestPriceEqual && styles.priceEqual,
            isLatestPriceLower && styles.priceLower
          )}
        >
          <span>
            {lastPriceInfo.latest
              ? toAmount({ value: lastPriceInfo.latest })
              : "--"}
          </span>
          {hasSetLatestPrice && !isLatestPriceEqual && (
            <span>
              {isLatestPriceHigher ? (
                <ArrowUpOutlined />
              ) : (
                <ArrowDownOutlined />
              )}
            </span>
          )}
        </div>
        {formattedDisplayTradeInfoList.latest.bids.map((v) => {
          const itemPrice = v[0];
          const itemSize = v[1];
          const total = v[2];
          return (
            <div
              key={`bids_${itemPrice}_${itemSize}`}
              className={styles.tradeInfoWrapper}
            >
              <div className={classNames(styles.priceCell, styles.buyColor)}>
                {toAmount({ value: itemPrice, isFixed:true })}
              </div>
              <div className={classNames(styles.textEnd, styles.sizeCell)}>
                {toAmount({ value: itemSize })}
              </div>
              <div className={classNames(styles.textEnd, styles.totalCell)}>
                {toAmount({ value: total })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Home;
