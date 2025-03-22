"use client";
import { useMemo } from "react";
import styles from "./page.module.css";
import { toAmount } from "@/utils/numberUtil";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import classNames from "classnames";
import useLastPrice from "@/components/hooks/useLastPrice";
import Decimal from "decimal.js";
import useTradeInfoList from "@/components/hooks/useTradeInfoList";


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
  const { tradeInfoList } = useTradeInfoList();
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
