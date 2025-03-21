/**
 * JSON 操作若失敗會導致 error ，故統一 try catch 並 return default。
 */
export const SafeJSON = {
  parse: (value: string, fallbackValue = {}) => {
    try {
      const result = JSON.parse(value);
      return result;
    } catch (error) {
      console.error(error);
      return fallbackValue;
    }
  },
  stringify: (value = {}, fallbackValue = "") => {
    try {
      const result = JSON.stringify(value);
      return result;
    } catch (error) {
      console.error(error);
      return fallbackValue;
    }
  },
};
