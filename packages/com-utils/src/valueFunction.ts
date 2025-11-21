export type ValueFunction<T = unknown> = T | ((oldValue?: T) => T);

/**
 * 获取 valueFunction 的解析值
 * @param value     要解析的 ValueFunction
 * @param oldValue  旧值
 */
export function getValueFunction<T>(value: ValueFunction<T>, oldValue?: T): T {
  if (value instanceof Function) {
    return value(oldValue);
  }
  return value;
}
