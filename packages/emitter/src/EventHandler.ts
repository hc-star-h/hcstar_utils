export type ListenerSignType = number | string | symbol;

// 监听函数的配置参数
export interface ListenerConfig {
  // 是否只触发一次
  once?: boolean;
  // 此监听函数的标记，符号。事件的触发方，可以通过指定特殊的sign，来实现同一个事件内部，按照不同的分类触发 listener
  sign?: ListenerSignType[];
}

/**
 * 事件控制器，支持单个事件的监听与触发
 */
export class EventHandler<L extends (...args: any[]) => any = (...args: any[]) => any> {
  readonly [Symbol.toStringTag]: string = 'EventHandler';

  // listener与config的映射集合
  protected _listeners: Map<L, ListenerConfig> = new Map();

  //每种type下的listener的映射集合
  protected _signListenerMap: Map<number | string | symbol, Set<L>> = new Map();

  /**
   * 当前的listener数量
   */
  get size() {
    return this._listeners.size;
  }

  /**
   * 是否存在某个事件监听函数
   * @param listener 要判断的目标listener函数
   */
  has(listener: L): boolean {
    return this._listeners.has(listener);
  }

  /**
   * 清空当前注册的所有事件监听函数
   * @param signArray 可以约束清除范围，如果指定了sign，则只清除包含指定sign的监听函数
   */
  clear(...signArray: ListenerSignType[]): void {
    if (!signArray.length) {
      for (const handler of this._listeners.keys()) {
        this.removeListener(handler);
      }
      return;
    }
    for (const sign of signArray) {
      const set = this._signListenerMap.get(sign);
      if (!set) {
        continue;
      }
      for (const l of set) {
        this.removeListener(l);
      }
    }
  }

  /**
   * 添加listener(如果进行重复添加，会先移除前一个handler，然后再重新添加)
   * @param handler 要添加的listener函数
   * @param config  该函数的配置
   */
  addListener(handler: L, config: ListenerConfig = {}): () => boolean {
    this.removeListener(handler);
    this._listeners.set(handler, config);
    if (config.sign?.length) {
      for (const s of config.sign) {
        let set: Set<L> | undefined = this._signListenerMap.get(s);
        if (!set) {
          set = new Set();
          this._signListenerMap.set(s, set);
        }
        set.add(handler);
      }
    }
    return () => this.removeListener(handler);
  }

  /**
   * 移除listener
   * @param handler 要移除的listener函数
   */
  removeListener(handler: L): boolean {
    if (!this._listeners.has(handler)) {
      return false;
    }
    const config = this._listeners.get(handler);
    this._listeners.delete(handler);
    if (config?.sign?.length) {
      for (const s of config.sign) {
        const set: Set<L> | undefined = this._signListenerMap.get(s);
        if (!set) {
          continue;
        }
        set.delete(handler);
        if (!set.size) {
          this._signListenerMap.delete(s);
        }
      }
    }
    return true;
  }

  /**
   * 监听函数以及他们的配置，迭代器
   * @param signArray 过滤的标识，如果传入，将按照指定标识去过滤 listener
   */
  [Symbol.iterator](signArray: ListenerSignType[] = []) {
    if (!signArray.length) {
      return this._listeners[Symbol.iterator]();
    }

    const map: Map<L, ListenerConfig> = new Map();
    for (const s of signArray) {
      const set = this._signListenerMap.get(s);
      if (!set) {
        continue;
      }
      for (const listener of set) {
        if (map.has(listener)) {
          continue;
        }
        map.set(listener, this._listeners.get(listener)!);
      }
    }
    return map[Symbol.iterator]();
  }

  /**
   * listener的执行器
   * @param listener  要执行的监听函数
   * @param config    listener 函数的config配置
   * @param args      执行 listener 函数所需要的入参
   */
  $execute(listener: L, config: ListenerConfig, args: Parameters<L>): CallListenerResult<L> {
    try {
      return {
        listener,
        config,
        args,
        returnValue: listener(...args)
      } as ExecuteListenerReturn<L>;
    } catch (e) {
      return {
        listener,
        config,
        args,
        catchError: e
      } as ExecuteListenerError<L>;
    } finally {
      if (config.once === true) {
        this.removeListener(listener);
      }
    }
  }

  /**
   * 将事件分发给监听函数
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   * @return { CallListenerResult[] } 收集每个listener的返回值
   */
  dispatch(args: Parameters<L>, signArray?: ListenerSignType[]): CallListenerResult<L>[] {
    const array: CallListenerResult<L>[] = [];
    for (const l of this[Symbol.iterator](signArray)) {
      array.push(this.$execute(l[0], l[1], args));
    }
    return array;
  }

  /**
   * 将事件分发给监听函数, 分发过程将会在微任务队列执行，不会阻塞主线程。内部会调用 dispatchAllSettled
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   */
  async dispatchAsync(args: Parameters<L>, signArray?: ListenerSignType[]): Promise<void> {
    await Promise.resolve();
    return this.dispatchAllSettled(args, signArray);
  }

  /**
   * 将事件分发给监听函数，并执行类似 Promise.all() 的函数逻辑：
   * 1. 如果监听函数返回Promise，会等待所有Promise resolve之后，才会resolve；
   * 2. 如果有listener抛出错误，或者返回的Promise被reject了，那么整个Promise就会reject；
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   */
  async dispatchAllResolve(args: Parameters<L>, signArray?: ListenerSignType[]): Promise<void> {
    return Promise.all(this.dispatchPromise(args, signArray)).then(() => undefined);
  }

  /**
   * 将事件分发给监听函数，并执行类似 Promise.allSettled() 的逻辑：
   * 1. 如果监听函数返回Promise，会等待所有 Promise 都 resolve / reject 之后，整个Promise才会resolve；
   * 2. 如果有listener抛出错误，会被转换为Promise.reject(error)，然后一并交由 Promise.allSettled() 处理；
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   */
  async dispatchAllSettled(args: Parameters<L>, signArray?: ListenerSignType[]): Promise<void> {
    return Promise.allSettled(this.dispatchPromise(args, signArray)).then(() => undefined);
  }

  /**
   * 将事件分发给监听函数, 并执行类似 Array.every() 的函数逻辑
   * @param args      事件参数
   * @param predicate (可选)返回值检查函数, 如果不传，则默认会直接检查结果是否为真值
   * @param signArray (可选)要触发的标识集合
   * @return { Promise<boolean> } 如果predicate所有的检查结果都是真值，则最终返回true，否则返回false;
   * 如果有组件抛错或者reject，则也返回false；
   */
  async dispatchEvery(
    args: Parameters<L>,
    predicate?: (returnValue: ReturnType<L>) => boolean | Promise<boolean>,
    signArray?: ListenerSignType[]
  ): Promise<boolean> {
    for (const item of this[Symbol.iterator](signArray)) {
      const result = this.$execute(item[0], item[1], args);
      if (isExecuteListenerError(result)) {
        return false;
      }
      try {
        if (!predicate) {
          if (!(await result.returnValue)) {
            return false;
          }
        } else if (!(await predicate(result.returnValue))) {
          return false;
        }
      } catch (error) {
        console.error(String(error));
        return false;
      }
    }
    return true;
  }

  /**
   * 将事件分发给监听函数, 并执行类似 Array.some() 的函数逻辑
   * @param args      事件参数
   * @param predicate (可选)返回值检查函数, 如果不传，则默认会直接检查结果是否为真值
   * @param signArray (可选)要触发的标识集合
   * @return { Promise<boolean> } 如果predicate所有的检查结果中存在至少一个真值，则最终返回true，否则返回false
   */
  async dispatchSome(
    args: Parameters<L>,
    predicate?: (returnValue: ReturnType<L>) => boolean | Promise<boolean>,
    signArray?: ListenerSignType[]
  ): Promise<boolean> {
    for (const item of this[Symbol.iterator](signArray)) {
      const result = this.$execute(item[0], item[1], args);
      if (isExecuteListenerError(result)) {
        continue;
      }
      try {
        if (!predicate) {
          if (await result.returnValue) {
            return true;
          }
        } else if (await predicate(result.returnValue)) {
          return true;
        }
      } catch (error) {
        console.error(String(error));
      }
    }
    return false;
  }

  /**
   * 执行listener，并将所有返回结果放入一个Promise数组中
   * @param args      执行listener需要的函数参数
   * @param signArray 过滤标识
   * @protected
   */
  protected dispatchPromise(args: Parameters<L>, signArray?: ListenerSignType[]): Promise<ReturnType<L>>[] {
    const promiseArray: Promise<ReturnType<L>>[] = [];
    for (const item of this[Symbol.iterator](signArray)) {
      const result = this.$execute(item[0], item[1], args);
      if (isExecuteListenerError(result)) {
        promiseArray.push(Promise.reject(result.catchError));
      } else if ((result.returnValue as any) instanceof Promise) {
        promiseArray.push(result.returnValue);
      }
    }
    return promiseArray;
  }

  /**
   * 当前EventHandler合并多个其他实例，将其中的监听函数copy过来
   * @param array 要合并的EventHandler集合
   */
  merge(...array: EventHandler<L>[]) {
    for (const item of array) {
      for (const [listener, config] of item) {
        this.addListener(listener, config);
      }
    }
  }
}

export interface ExecuteListenerBase<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> {
  // listener函数
  listener: L;
  // listener函数配置
  config: ListenerConfig;
  // 调用函数时的入参
  args: Parameters<L>;
}

export interface ExecuteListenerReturn<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>
  extends ExecuteListenerBase<L> {
  // 调用目标listener后获得的返回值
  returnValue: ReturnType<L>;
}

export function isExecuteListenerReturn<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>(
  value: CallListenerResult<L>
): value is ExecuteListenerReturn<L> {
  return (value as ExecuteListenerError).catchError === undefined;
}

export interface ExecuteListenerError<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>
  extends ExecuteListenerBase<L> {
  // 运行过程中捕获到了错误
  catchError: unknown;
}

export function isExecuteListenerError<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>(
  value: CallListenerResult<L>
): value is ExecuteListenerError<L> {
  return (value as ExecuteListenerError).catchError !== undefined;
}

export type CallListenerResult<L extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> =
  | ExecuteListenerReturn<L>
  | ExecuteListenerError<L>;
