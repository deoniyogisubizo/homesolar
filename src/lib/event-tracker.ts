"use client";

import { useEffect, useRef, useCallback } from "react";

const ANON_ID_COOKIE = "hs_anon_id";
const ANON_ID_EXPIRY_DAYS = 365;
const EVENT_BATCH_SIZE = 10;
const EVENT_FLUSH_INTERVAL_MS = 5000;

function generateAnonId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getAnonId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(^| )${ANON_ID_COOKIE}=([^;]+)`));
  if (match) return match[2];
  const anonId = generateAnonId();
  setAnonIdCookie(anonId);
  return anonId;
}

function setAnonIdCookie(anonId: string): void {
  if (typeof document === "undefined") return;
  const expiry = new Date(Date.now() + ANON_ID_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${ANON_ID_COOKIE}=${anonId}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax; Secure`;
}

function clearAnonIdCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ANON_ID_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
}

interface EventPayload {
  type: "view" | "search" | "cart_add" | "cart_remove" | "wishlist" | "purchase" | "click";
  productId?: string;
  query?: string;
  metadata?: Record<string, unknown>;
}

interface QueuedEvent extends EventPayload {
  anonId: string;
  timestamp: number;
}

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushInProgress = false;

async function flushEvents(): Promise<void> {
  if (isFlushInProgress || eventQueue.length === 0) return;

  isFlushInProgress = true;
  const batch = eventQueue.splice(0, EVENT_BATCH_SIZE);

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    eventQueue.unshift(...batch);
  } finally {
    isFlushInProgress = false;
    if (eventQueue.length > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, EVENT_FLUSH_INTERVAL_MS);
}

function queueEvent(event: EventPayload): void {
  const anonId = getAnonId();
  eventQueue.push({ ...event, anonId, timestamp: Date.now() });
  if (eventQueue.length >= EVENT_BATCH_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushEvents();
  } else {
    scheduleFlush();
  }
}

export function trackEvent(event: EventPayload): void {
  if (typeof window === "undefined") return;
  queueEvent(event);
}

export function trackView(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "view", productId, metadata });
}

export function trackSearch(query: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "search", query, metadata });
}

export function trackCartAdd(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "cart_add", productId, metadata });
}

export function trackCartRemove(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "cart_remove", productId, metadata });
}

export function trackWishlist(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "wishlist", productId, metadata });
}

export function trackPurchase(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "purchase", productId, metadata });
}

export function trackClick(productId: string, metadata?: Record<string, unknown>): void {
  trackEvent({ type: "click", productId, metadata });
}

export function mergeAnonIdToUser(userId: string): void {
  if (typeof window === "undefined") return;
  const anonId = getAnonId();
  if (!anonId) return;

  fetch("/api/events/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId, userId }),
    keepalive: true,
  }).catch(() => {});

  clearAnonIdCookie();
}

export function useEventTracker(): {
  trackView: (productId: string, metadata?: Record<string, unknown>) => void;
  trackSearch: (query: string, metadata?: Record<string, unknown>) => void;
  trackCartAdd: (productId: string, metadata?: Record<string, unknown>) => void;
  trackCartRemove: (productId: string, metadata?: Record<string, unknown>) => void;
  trackWishlist: (productId: string, metadata?: Record<string, unknown>) => void;
  trackPurchase: (productId: string, metadata?: Record<string, unknown>) => void;
  trackClick: (productId: string, metadata?: Record<string, unknown>) => void;
} {
  const trackViewRef = useRef(trackView);
  const trackSearchRef = useRef(trackSearch);
  const trackCartAddRef = useRef(trackCartAdd);
  const trackCartRemoveRef = useRef(trackCartRemove);
  const trackWishlistRef = useRef(trackWishlist);
  const trackPurchaseRef = useRef(trackPurchase);
  const trackClickRef = useRef(trackClick);

  useEffect(() => {
    trackViewRef.current = trackView;
    trackSearchRef.current = trackSearch;
    trackCartAddRef.current = trackCartAdd;
    trackCartRemoveRef.current = trackCartRemove;
    trackWishlistRef.current = trackWishlist;
    trackPurchaseRef.current = trackPurchase;
    trackClickRef.current = trackClick;
  });

  return {
    trackView: useCallback((productId: string, metadata?: Record<string, unknown>) => trackViewRef.current(productId, metadata), []),
    trackSearch: useCallback((query: string, metadata?: Record<string, unknown>) => trackSearchRef.current(query, metadata), []),
    trackCartAdd: useCallback((productId: string, metadata?: Record<string, unknown>) => trackCartAddRef.current(productId, metadata), []),
    trackCartRemove: useCallback((productId: string, metadata?: Record<string, unknown>) => trackCartRemoveRef.current(productId, metadata), []),
    trackWishlist: useCallback((productId: string, metadata?: Record<string, unknown>) => trackWishlistRef.current(productId, metadata), []),
    trackPurchase: useCallback((productId: string, metadata?: Record<string, unknown>) => trackPurchaseRef.current(productId, metadata), []),
    trackClick: useCallback((productId: string, metadata?: Record<string, unknown>) => trackClickRef.current(productId, metadata), []),
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (eventQueue.length > 0) {
      flushEvents();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && eventQueue.length > 0) {
      flushEvents();
    }
  });
}