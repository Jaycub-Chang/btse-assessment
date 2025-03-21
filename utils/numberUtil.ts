import Decimal from 'decimal.js';
import { isNil } from 'lodash';

export interface IAmountParam {
  value: string | number;
  decimalPlace?: number; // 要顯示到小數第幾位
  roundMethod?: typeof Decimal.ROUND_HALF_UP | typeof Decimal.ROUND_DOWN;
  thousandsSeparator?: boolean; // 是否有千分位符號
  isFixed?: boolean; // 數值捨入到指定的小數位數或整數(decimalPlace), 不足的位數補0
}

const toExpNeg = -30;
const toExpPos = 40;
const precision = Math.abs(toExpNeg) + Math.abs(toExpPos);

Decimal.set({ toExpNeg, toExpPos, precision });

/**
 * 處理浮點數 相加 問題
 */

export const numAdd = (...allAddNum: (string | number)[]): string => {
  const convertAllAddNumToDecimal = allAddNum.map(num => new Decimal(num || 0));
  const totalDecimal = Decimal.sum(...convertAllAddNumToDecimal);
  return totalDecimal.toString();
};

/**
 * 處理浮點數 相乘 問題
 */
export const numMultiply = (...allMulNum: (string | number)[]): string => {
  let counter = new Decimal(1);
  for (let i = 0; i < allMulNum.length; i++) {
    const mulValue = new Decimal(allMulNum[i] || 0);
    counter = counter.mul(mulValue);
  }
  return counter.toString();
};

/**
 * 處理浮點數 相除 問題
 */
export const numDivide = (numerator: string | number, denominator: string | number): string => {
  const numeratorDecimal = new Decimal(numerator || 0);
  const denominatorDecimal = new Decimal(denominator || 0);
  return numeratorDecimal.dividedBy(denominatorDecimal).toString();
};

export const numberWithThousandSeparator = (x: string) => {
  const [roundNumber, decimalNumber] = x.split('.');
  const formatRoundNumber = roundNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalNumber ? [formatRoundNumber, decimalNumber].join('.') : formatRoundNumber;
};

export const toAmount = ({
  value,
  decimalPlace = 1,
  roundMethod = Decimal.ROUND_DOWN,
  thousandsSeparator = true,
  isFixed = false,
}: IAmountParam) => {
  // 1. null, undefined 處理
  if (isNil(value)) value = 0;
  const decimalValue = new Decimal(value);

  // 3. 位數顯示，四捨五入處理, toFixed 強制補 0, toDecimalPlaces 後面不補 0
  const amount = decimalPlace
    ? isFixed
      ? decimalValue.toFixed(decimalPlace, roundMethod)
      : decimalValue.toDecimalPlaces(decimalPlace, roundMethod)
    : decimalValue.toDecimalPlaces(30, roundMethod);
  // 4. 字串化
  let amountString = amount.toString();

  // 6. 千分位轉換
  if (thousandsSeparator) {
    amountString = numberWithThousandSeparator(amountString);
  }

  return amountString;
};

export const integerAndDecimalSymbolReg = /^\d*\.?\d*$/;
