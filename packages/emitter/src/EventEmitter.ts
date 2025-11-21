import { type ListenerConfig, type ListenerSignType, type CallListenerResult, EventHandler } from './EventHandler';

export class EventEmitter<ELM extends { [K in keyof ELM]: (...args: any[]) => any }> {
  // 事件与订阅者
  protected readonly _eventHandlers: Map<keyof ELM, EventHandler<ELM[keyof ELM]>> = new Map();
  // 当前实例的唯一标识
  protected readonly _insSymbol = Symbol('EventEmitter');

  /**
   * 清空当前Emitter;
   */
  clear() {
    for (const handler of this._eventHandlers.values()) {
      handler.clear(this._insSymbol);
    }
    return this._eventHandlers.clear();
  }

  /**
   * 清空单个EventHandler实例
   * @param type      要清空的事件类型
   * @param signArray 可以约束清除范围，如果指定了sign，则只清除包含指定sign的监听函数
   */
  clearHandler<T extends keyof ELM>(type: T, ...signArray: ListenerSignType[]) {
    return this.getEventHandler(type).clear(...signArray);
  }

  /**
   * 手动设置外部的EventHandler实例，它将替换内部原有的实例（如果该实例存在的话），以实现事件共享
   * @param type  要添加的事件类型
   * @param newHandler 要添加的 EventHandler 实例
   */
  setEventHandler<T extends keyof ELM>(type: T, newHandler: EventHandler<ELM[T]>): void {
    const oldHandler = this._eventHandlers.get(type) as EventHandler<ELM[T]> | undefined;
    if (oldHandler) {
      newHandler.merge(oldHandler);
    }
    this._eventHandlers.set(type, newHandler);
  }

  /**
   * 获取事件控制器 handler
   * @param type				事件类型
   * @param autoCreate	如果原 handler 不存在，是否自动创建
   */
  getEventHandler<T extends keyof ELM>(type: T, autoCreate: false): EventHandler<ELM[T]> | undefined;
  getEventHandler<T extends keyof ELM>(type: T, autoCreate?: true): EventHandler<ELM[T]>;
  getEventHandler<T extends keyof ELM>(type: T, autoCreate?: boolean): EventHandler<ELM[T]> | undefined {
    let lHandler = this._eventHandlers.get(type) as EventHandler<ELM[T]> | undefined;
    if (!lHandler && autoCreate !== false) {
      lHandler = new EventHandler<ELM[T]>();
      this._eventHandlers.set(type, lHandler);
    }
    return lHandler;
  }

  /**
   * 添加事件监听函数
   * @param type    事件类型
   * @param handler 监听函数
   * @param config  函数配置
   */
  addListener<T extends keyof ELM>(type: T, handler: ELM[T], config: ListenerConfig = {}): () => void {
    const c: ListenerConfig = { ...config, sign: config.sign ? [...config.sign, this._insSymbol] : [this._insSymbol] };
    return this.getEventHandler(type).addListener(handler, c);
  }

  /**
   * 移除事件监听函数
   * @param type    事件类型
   * @param handler 要移除的监听函数
   */
  removeListener<T extends keyof ELM>(type: T, handler: ELM[T]) {
    return this.getEventHandler(type).removeListener(handler);
  }

  /**
   * 触发某个事件(最简单的, 经典的事件触发函数)：
   * @param type      事件类型
   * @param args      触发事件的参数
   * @param signArray (可选)要触发的标识集合
   */
  dispatch<T extends keyof ELM>(
    type: T,
    args: Parameters<ELM[T]>,
    signArray?: ListenerSignType[]
  ): CallListenerResult<ELM[T]>[] {
    return this.getEventHandler(type).dispatch(args, signArray);
  }

  /**
   * 将事件分发给监听函数, 分发过程将会在微任务队列执行，不会阻塞主线程。内部会调用 dispatchAllSettled
   * @param type      事件类型
   * @param args      触发事件的参数
   * @param signArray (可选)要触发的标识集合
   */
  dispatchAsync<T extends keyof ELM>(type: T, args: Parameters<ELM[T]>, signArray?: ListenerSignType[]): Promise<void> {
    return this.getEventHandler(type).dispatchAsync(args, signArray);
  }

  /**
   * 将事件分发给监听函数，并执行类似 Promise.all() 的函数逻辑：
   * 1. 如果监听函数返回Promise，会等待所有Promise resolve之后，才会resolve；
   * 2. 如果有listener抛出错误，或者返回的Promise被reject了，那么整个Promise就会reject；
   * @param type      事件类型
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   */
  dispatchAllResolve<T extends keyof ELM>(
    type: T,
    args: Parameters<ELM[T]>,
    signArray?: (number | string)[]
  ): Promise<void> {
    return this.getEventHandler(type).dispatchAllResolve(args, signArray);
  }

  /**
   * 将事件分发给监听函数，并执行类似 Promise.allSettled() 的逻辑：
   * 1. 如果监听函数返回Promise，会等待所有 Promise 都 resolve / reject 之后，整个Promise才会resolve；
   * 2. 如果有listener抛出错误，会被转换为Promise.reject(error)，然后一并交由 Promise.allSettled() 处理；
   * @param type      事件类型
   * @param args      触发 listener 所需要的参数
   * @param signArray (可选)要触发的标识集合
   */
  dispatchAllSettled<T extends keyof ELM>(
    type: T,
    args: Parameters<ELM[T]>,
    signArray?: (number | string)[]
  ): Promise<void> {
    return this.getEventHandler(type).dispatchAllSettled(args, signArray);
  }

  /**
   * 将事件分发给监听函数, 并执行类似 Array.every() 的函数逻辑
   * @param type      事件类型
   * @param args      触发 listener 所需要的参数
   * @param predicate (可选)返回值检查函数, 如果不传，则默认会直接检查结果是否为真值
   * @param signArray (可选)要触发的标识集合
   * @return { Promise<boolean> } 如果predicate所有的检查结果都是真值，则最终返回true，否则返回false
   */
  dispatchEvery<T extends keyof ELM>(
    type: T,
    args: Parameters<ELM[T]>,
    predicate?: (returnValue: ReturnType<ELM[T]>) => boolean | Promise<boolean>,
    signArray?: (number | string)[]
  ): Promise<boolean> {
    return this.getEventHandler(type).dispatchEvery(args, predicate, signArray);
  }

  /**
   * 将事件分发给监听函数, 并执行类似 Array.some() 的函数逻辑
   * @param type      事件类型
   * @param args      事件参数
   * @param predicate (可选)返回值检查函数, 如果不传，则默认会直接检查结果是否为真值
   * @param signArray (可选)要触发的标识集合
   * @return { Promise<boolean> } 如果predicate所有的检查结果中存在至少一个真值，则最终返回true，否则返回false
   */
  dispatchSome<T extends keyof ELM>(
    type: T,
    args: Parameters<ELM[T]>,
    predicate?: (returnValue: ReturnType<ELM[T]>) => boolean | Promise<boolean>,
    signArray?: (number | string)[]
  ): Promise<boolean> {
    return this.getEventHandler(type).dispatchSome(args, predicate, signArray);
  }
}
