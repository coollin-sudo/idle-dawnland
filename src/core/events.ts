type Handler<T> = (payload: T) => void;

/** 型別安全的事件匯流排。邏輯層發事件，渲染層與 UI 訂閱。 */
export class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};
  /** 關閉時不分派任何事件（離線模擬、平衡模擬用） */
  muted = false;

  on<K extends keyof Events>(type: K, fn: Handler<Events[K]>): () => void {
    (this.handlers[type] ??= new Set()).add(fn);
    return () => this.off(type, fn);
  }

  off<K extends keyof Events>(type: K, fn: Handler<Events[K]>): void {
    this.handlers[type]?.delete(fn);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    if (this.muted) return;
    const set = this.handlers[type];
    if (!set) return;
    for (const fn of set) fn(payload);
  }

  clear(): void {
    this.handlers = {};
  }
}
