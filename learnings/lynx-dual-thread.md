Lynx manages most dual-thread operations implicitly by default, but you explicitly control thread placement for specific functions or events when needed.

## Default Threading
Your app code runs on the background thread (BTS) automatically, keeping the main UI thread (MTS) responsive for rendering and interactions. No changes required for standard logic like data fetching or computations. [lynxjs](https://lynxjs.org/next/blog/lynx-3-5)

## Run on Main Thread
Use the `main-thread:bindtap` attribute on `<view>` elements for low-latency event handlers:

```
<view main-thread:bindtap={handleTap}>
  <text>Tap me</text>
</view>
```

Or define MTS functions directly:

```
function handleInnerTap(e: MainThread.TouchEvent) {
  'main thread';
  e.stopPropagation();
}
```

## Cross-Thread Calls
Use `runOnMainThread()` or `runOnBackground()` APIs for explicit dispatch:

```
runOnMainThread(async () => {
  // MTS work with async return support
});
```

This handles communication without shared mutable state—data passes via messages. [youtube](https://www.youtube.com/watch?v=KCQsP91Wor0)