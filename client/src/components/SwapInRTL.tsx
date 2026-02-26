import React from "react";

type SwapInRTLProps = {
  isRTL: boolean;
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
};

export function SwapInRTL({ isRTL, left, middle, right }: SwapInRTLProps) {
  if (isRTL) {
    return (
      <>
        {right}
        {middle}
        {left}
      </>
    );
  }

  return (
    <>
      {left}
      {middle}
      {right}
    </>
  );
}
