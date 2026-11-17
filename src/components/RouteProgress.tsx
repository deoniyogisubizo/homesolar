"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (fallback.current) {
      clearTimeout(fallback.current);
      fallback.current = null;
    }
    setProgress(100);
    if (finishTimer.current) clearTimeout(finishTimer.current);
    finishTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  }, []);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(10);
    if (fallback.current) clearTimeout(fallback.current);
    fallback.current = setTimeout(() => finish(), 900);
  }, [finish]);

  // Finish quickly once the route actually changes.
  useEffect(() => {
    const timer = window.setTimeout(finish, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, finish]);

  // Trigger on every click anywhere on the page.
  useEffect(() => {
    function onClick() {
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // Creep the bar forward while visible.
  useEffect(() => {
    if (!visible || progress >= 90) return;
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? Math.min(p + Math.random() * 8, 90) : p));
    }, 120);
    return () => clearInterval(interval);
  }, [visible, progress]);

  const outerClass =
    "fixed top-0 left-0 right-0 z-[9999] h-0.5 transition-opacity duration-300 " +
    (visible ? "opacity-100" : "opacity-0");

  return (
    <div className={outerClass}>
      <div
        className="h-full transition-all duration-200"
        style={{ width: progress + "%", background: "var(--color-brand)" }}
      />
    </div>
  );
}