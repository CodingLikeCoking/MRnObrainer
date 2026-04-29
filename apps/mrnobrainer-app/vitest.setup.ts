import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { JSDOM } from "jsdom";

if (typeof window === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalWithDom = globalThis as any;

  globalWithDom.window = dom.window;
  globalWithDom.document = dom.window.document;
  globalWithDom.navigator = dom.window.navigator;
  globalWithDom.location = dom.window.location;
  globalWithDom.HTMLElement = dom.window.HTMLElement;
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

function ensureLocalStorage() {
  const currentStorage = globalThis.localStorage;
  if (
    currentStorage &&
    typeof currentStorage.getItem === "function" &&
    typeof currentStorage.setItem === "function" &&
    typeof currentStorage.removeItem === "function" &&
    typeof currentStorage.clear === "function"
  ) {
    return;
  }

  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  }
}

ensureLocalStorage();

beforeEach(() => {
  ensureLocalStorage();
});
