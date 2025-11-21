# @hcstar/emitter

一个功能强大的事件发射器工具库，提供了灵活的事件管理机制。

## 安装

```bash
npm install @hcstar/emitter
```


## 功能特性

- 🔄 支持同步和异步事件处理
- 🔧 灵活的事件监听器配置（一次性监听、标记过滤等）
- 📦 提供 `EventEmitter` 和 `EventHandler` 两个核心类
- 🌐 支持 TypeScript 类型定义
- 🛠️ 支持基于标识符(sign)的精确事件控制

## 核心概念

### EventEmitter

`EventEmitter` 是主要的事件管理器，用于管理多种类型的事件：

```typescript
import { EventEmitter } from '@hcstar/emitter';

interface Events {
  'user-login': (username: string) => void;
  'data-loaded': (data: any[]) => void;
}

const emitter = new EventEmitter<Events>();

// 添加监听器
emitter.addListener('user-login', (username) => {
  console.log(`Welcome ${username}`);
});

// 触发事件
emitter.dispatch('user-login', ['Alice']);
```


### EventHandler

`EventHandler` 管理单一类型事件的所有监听器：

```typescript
import { EventHandler } from '@hcstar/emitter';

const handler = new EventHandler<(msg: string) => void>();

handler.addListener((msg) => console.log(msg));

handler.dispatch(['Hello World']);
```


## API 文档

### EventEmitter API

#### 添加监听器

```typescript
function addListener<T extends keyof ELM>(
  type: T, 
  handler: ELM[T], 
  config?: ListenerConfig
): () => void
```


添加事件监听器，返回用于移除监听器的函数。

#### 移除监听器

```typescript
function removeListener<T extends keyof ELM>(
  type: T, 
  handler: ELM[T]
): boolean
```


移除指定的事件监听器。

#### 触发事件

```typescript
// 同步触发
function dispatch<T extends keyof ELM>(
  type: T,
  args: Parameters<ELM[T]>,
  signArray?: ListenerSignType[]
): CallListenerResult<ELM[T]>[]

// 异步触发
function dispatchAsync<T extends keyof ELM>(
  type: T,
  args: Parameters<ELM[T]>,
  signArray?: ListenerSignType[]
): Promise<void>
```


#### 特殊触发方式

- `dispatchAllResolve`: 类似 `Promise.all` 行为
- `dispatchAllSettled`: 类似 `Promise.allSettled` 行为
- `dispatchEvery`: 类似 `Array.every` 行为
- `dispatchSome`: 类似 `Array.some` 行为

### EventHandler API

提供了与 `EventEmitter` 中针对单个事件类型相似的方法：

- `addListener`
- `removeListener`
- `dispatch`
- `dispatchAsync`
- `dispatchAllResolve`
- `dispatchAllSettled`
- `dispatchEvery`
- `dispatchSome`

### 配置选项

监听器配置 (`ListenerConfig`) 包括：

- `once`: boolean - 是否只触发一次
- `sign`: ListenerSignType[] - 监听器标识符数组

## 使用示例

### 基础使用

```typescript
import { EventEmitter } from '@hcstar/emitter';

interface AppEvents {
  'page-view': (path: string) => void;
  'user-action': (action: string, data: any) => void;
}

const appEvents = new EventEmitter<AppEvents>();

// 订阅事件
appEvents.addListener('page-view', (path) => {
  console.log(`Viewing page: ${path}`);
});

// 发布事件
appEvents.dispatch('page-view', ['/home']);
```


### 使用标识符控制监听器

```typescript
const unsubscribe = emitter.addListener('data-update', handler, {
  sign: ['moduleA', 'critical']
});

// 只触发带有特定标识符的监听器
emitter.dispatch('data-update', [data], ['moduleA']);
```


### 一次性监听器

```typescript
emitter.addListener('init-complete', handler, {
  once: true
});
```


## License

MIT