"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { SafeJSON } from "@/utils";
import { toAmount } from "@/utils/numberUtil";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import classNames from "classnames";
import useLastPrice from "@/components/hooks/useLastPrice";
import Decimal from "decimal.js";

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

interface IDisplayTradeInfoList {
  latest: {
    // price, size, total
    asks: [string, string, string][];
    bids: [string, string, string][];
  };
  previous: {
    asks: [string, string][];
    bids: [string, string][];
  };
}

const calculateTotal = (
  values: [string, string][]
): [string, string, string][] => {
  let currentTotal = new Decimal(0);
  return values.map((v) => {
    currentTotal = currentTotal.add(new Decimal(v[1]));
    return [v[0], v[1], currentTotal.toString()];
  });
};

const Home: React.FC = () => {
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

  // tradeInfoList 更新太快所以節流優化
  const formattedDisplayTradeInfoList =
    useMemo<IDisplayTradeInfoList>((): IDisplayTradeInfoList => {
      const latestAsksArray = tradeInfoList.latest.asks;
      const latestBidsArray = tradeInfoList.latest.bids;
      return {
        ...tradeInfoList,
        latest: {
          // 賣出加總需反過來計算
          asks: calculateTotal(latestAsksArray.reverse()).reverse(),
          bids: calculateTotal(latestBidsArray),
        },
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
          {formattedDisplayTradeInfoList.latest.asks.map(
            ([itemPrice, itemSize, total], index) => {
              // Accumulative ratio
              const asksList = formattedDisplayTradeInfoList.latest.asks;
              const totalAll = asksList[0][2];
              const ratio = (Number(total) / Number(totalAll)) * 100;
              // is new or not
              const previousValuesObj = Object.fromEntries(
                formattedDisplayTradeInfoList.previous.asks
              );
              const hasShown = itemPrice in previousValuesObj;
              const isSizeHigher =
                Number(itemSize) > Number(previousValuesObj[itemPrice]);
              const isSizeLower =
                Number(itemSize) < Number(previousValuesObj[itemPrice]);

              return (
                <div
                  key={`asks_${itemPrice}_${itemSize}_${total}_${index}`}
                  className={classNames(
                    styles.tradeInfoWrapper,
                    !hasShown && styles.flashRedAnimation
                  )}
                >
                  <div
                    className={classNames(styles.priceCell, styles.sellColor)}
                  >
                    {toAmount({ value: itemPrice, isFixed: true })}
                  </div>
                  <div
                    className={classNames(
                      styles.textEnd,
                      styles.sizeCell,
                      hasShown && isSizeLower && styles.flashRedAnimation,
                      hasShown && isSizeHigher && styles.flashGreenAnimation
                    )}
                  >
                    {toAmount({ value: itemSize })}
                  </div>
                  <div className={classNames(styles.textEnd, styles.totalCell)}>
                    {toAmount({ value: total })}
                    <div
                      className={classNames(
                        styles.totalCellAccumulative,
                        styles.sellAccumulativeBg
                      )}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
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
        {formattedDisplayTradeInfoList.latest.bids.map(
          ([itemPrice, itemSize, total], index) => {
            // Accumulative ratio
            const bidsList = formattedDisplayTradeInfoList.latest.bids;
            const totalAll = bidsList[bidsList.length - 1][2];
            const ratio = (Number(total) / Number(totalAll)) * 100;
            // is new or not
            const previousValuesObj = Object.fromEntries(
              formattedDisplayTradeInfoList.previous.bids
            );
            const hasShown = itemPrice in previousValuesObj;
            const isSizeHigher =
                Number(itemSize) > Number(previousValuesObj[itemPrice]);
              const isSizeLower =
                Number(itemSize) < Number(previousValuesObj[itemPrice]);

            return (
              <div
                key={`bids_${itemPrice}_${itemSize}_${total}_${index}`}
                className={classNames(
                  styles.tradeInfoWrapper,
                  !hasShown && styles.flashGreenAnimation
                )}
              >
                <div className={classNames(styles.priceCell, styles.buyColor)}>
                  {toAmount({ value: itemPrice, isFixed: true })}
                </div>
                <div
                  className={classNames(
                    styles.textEnd,
                    styles.sizeCell,
                    hasShown && isSizeLower && styles.flashRedAnimation,
                    hasShown && isSizeHigher && styles.flashGreenAnimation
                  )}
                >
                  {toAmount({ value: itemSize })}
                </div>
                <div className={classNames(styles.textEnd, styles.totalCell)}>
                  {toAmount({ value: total })}
                  <div
                    className={classNames(
                      styles.totalCellAccumulative,
                      styles.buyAccumulativeBg
                    )}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
export default Home;
