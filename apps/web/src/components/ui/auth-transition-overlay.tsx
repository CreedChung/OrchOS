"use client";

import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { GridPixelateWipe } from "@/components/ui/grid-pixelate-wipe";

interface AuthTransitionOverlayProps {
  active: boolean;
  reveal: boolean;
  onComplete?: () => void;
}

const TRANSITION_DURATION_FRAMES = 44;
const TRANSITION_FPS = 30;
const HOLD_BEFORE_WIPE_MS = 520;

function AuthScene({ reveal }: { reveal: boolean }) {
  return (
    <GridPixelateWipe
      cols={14}
      rows={8}
      pattern="wave"
      transitionStart={0}
      transitionDuration={TRANSITION_DURATION_FRAMES}
      cellFadeFrames={6}
      from={
        <div className="absolute inset-0 overflow-hidden bg-background">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/background.png')" }}
          />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
        </div>
      }
      to={
        <div className="absolute inset-0 bg-background">
          <div
            className={[
              "absolute inset-0 transition-opacity duration-300",
              reveal ? "opacity-0" : "opacity-100",
            ].join(" ")}
            style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.05), rgb(0 0 0 / 0))" }}
          />
        </div>
      }
      className="absolute inset-0"
    />
  );
}

export function AuthTransitionOverlay({ active, reveal, onComplete }: AuthTransitionOverlayProps) {
  const [shouldPlay, setShouldPlay] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active) {
      setShouldPlay(false);
      return;
    }

    if (!reveal) {
      setShouldPlay(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldPlay(true);
    }, HOLD_BEFORE_WIPE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [active, reveal]);

  if (!active) {
    return null;
  }

  if (!shouldPlay) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background.png')" }}
        />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
      <Player
        component={AuthScene}
        inputProps={{ reveal }}
        durationInFrames={TRANSITION_DURATION_FRAMES}
        fps={TRANSITION_FPS}
        compositionWidth={1280}
        compositionHeight={720}
        controls={false}
        autoPlay
        clickToPlay={false}
        style={{ width: "100%", height: "100%" }}
        onEnded={() => {
          if (completedRef.current) {
            return;
          }

          completedRef.current = true;
          onComplete?.();
        }}
      />
    </div>
  );
}
