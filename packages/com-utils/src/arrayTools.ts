/**
 * 获取数组中的随机值
 * @param array 要获取的数组
 */
export function getRandomValueFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 获取二维数组的左侧元素
 * @param array 要获取的数组
 * @param row 行索引
 * @param column 列索引
 */
export function getDoubleArrayLeft<T>(array: T[][], row: number, column: number): T | null {
  if (column === 0) {
    return null;
  }
  return array[row][column - 1];
}

/**
 * 获取二维数组的右侧元素
 * @param array 要获取的数组
 * @param row 行索引
 * @param column 列索引
 */
export function getDoubleArrayRight<T>(array: T[][], row: number, column: number): T | null {
  if (column === array[row].length - 1) {
    return null;
  }
  return array[row][column + 1];
}

/**
 * 获取二维数组的上方元素
 * @param array 要获取的数组
 * @param row 行索引
 * @param column 列索引
 */
export function getDoubleArrayTop<T>(array: T[][], row: number, column: number): T | null {
  if (row === 0) {
    return null;
  }
  return array[row - 1][column];
}

/**
 * 获取二维数组的下方元素
 * @param array 要获取的数组
 * @param row 行索引
 * @param column 列索引
 */
export function getDoubleArrayBottom<T>(array: T[][], row: number, column: number): T | null {
  if (row === array.length - 1) {
    return null;
  }
  return array[row + 1][column];
}
