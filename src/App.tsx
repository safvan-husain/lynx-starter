import { useCallback, useEffect, useState } from '@lynx-js/react';

import arrow from './assets/arrow.png';
import lynxLogo from './assets/lynx-logo.png';
import reactLynxLogo from './assets/react-logo.png';

export function App(props: { onRender?: () => void }) {
  const [alterLogo, setAlterLogo] = useState(false);

  useEffect(() => {
    console.info('Hello, ReactLynx');
  }, []);
  props.onRender?.();

  const onTap = useCallback(() => {
    'background only';
    setAlterLogo((prevAlterLogo) => !prevAlterLogo);
  }, []);

  return (
    <view className="relative min-h-screen bg-black">
      <view className="fixed h-[200vw] w-[200vw] -left-[14.27vw] -top-[60vw] rotate-[15.25deg] rounded-full bg-[radial-gradient(71.43%_62.3%_at_46.43%_36.43%,rgba(18,229,229,0)_15%,rgba(239,155,255,0.3)_56.35%,#ff6448_100%)] shadow-[inset_0px_12.93px_28.74px_0px_#ffd28db2]" />
      <view className="relative flex min-h-screen flex-col items-center justify-center">
        <view className="z-[100] flex flex-[5] flex-col items-center justify-center">
          <view
            className="mb-2 flex flex-col items-center justify-center"
            bindtap={onTap}
          >
            {alterLogo ? (
              <image
                src={reactLynxLogo}
                className="h-[100px] w-[100px] animate-logo-spin"
              />
            ) : (
              <image
                src={lynxLogo}
                className="h-[100px] w-[100px] animate-logo-pulse"
              />
            )}
          </view>
          <text className="text-[36px] font-bold text-white">React</text>
          <text className="mb-2 text-[22px] font-semibold italic text-white">
            on Lynx
          </text>
        </view>
        <view className="flex flex-col items-center justify-center">
          <image src={arrow} className="h-6 w-6" />
          <text className="m-[15rpx] text-[20px] text-yellow-100">
            Tap the logo and have fun twice!
          </text>
          <text className="m-[5px] text-[12px] text-white/65">
            Edit
            <text className="italic text-white/85">{' src/App.tsx '}</text>
            to see updates!
          </text>
        </view>
        <view className="flex-1" />
      </view>
    </view>
  );
}
