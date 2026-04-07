"use client";

import { useEffect, useRef, useState } from "react";
import { useSound } from "@/hooks/useSound";

const INTRO_DURATION = 2800; // ms until intro unmounts

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const { introSound } = useSound();
  const played = useRef(false);

  useEffect(() => {
    // Play intro sound on first render
    if (!played.current) {
      played.current = true;
      // Small delay so AudioContext unlocks after first paint
      const t = setTimeout(() => introSound(), 80);
      return () => clearTimeout(t);
    }
  }, [introSound]);

  useEffect(() => {
    // Remove from DOM after CSS fade-out completes
    const t = setTimeout(() => setVisible(false), INTRO_DURATION + 200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="intro-screen"
      style={{ "--intro-exit-delay": `${INTRO_DURATION - 500}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="intro-content">
        <div className="intro-logo">
          Нейро<span>·</span>диктофон
        </div>
        <div className="intro-tagline">Speech to text · offline</div>
        <div className="intro-bar-track">
          <div className="intro-bar-fill" style={{ animationDuration: `${INTRO_DURATION - 400}ms` }} />
        </div>
      </div>
    </div>
  );
}
