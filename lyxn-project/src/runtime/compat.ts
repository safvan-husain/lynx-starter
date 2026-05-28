type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const PromiseWithOptionalResolvers = Promise as PromiseConstructor & {
  withResolvers?: <T>() => PromiseWithResolvers<T>;
};

if (typeof PromiseWithOptionalResolvers.withResolvers !== 'function') {
  Object.defineProperty(PromiseWithOptionalResolvers, 'withResolvers', {
    configurable: true,
    writable: true,
    value<T>(): PromiseWithResolvers<T> {
      let resolve!: PromiseWithResolvers<T>['resolve'];
      let reject!: PromiseWithResolvers<T>['reject'];
      const promise = new Promise<T>((nextResolve, nextReject) => {
        resolve = nextResolve;
        reject = nextReject;
      });

      return { promise, resolve, reject };
    },
  });
}

export {};
