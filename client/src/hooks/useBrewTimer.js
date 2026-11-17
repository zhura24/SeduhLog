import { useCallback, useEffect, useRef, useState } from 'react';

export const elapsedSeconds = (startTimestamp, accumulatedSeconds, now = Date.now()) =>
  accumulatedSeconds + (now - startTimestamp) / 1000;

export function useBrewTimer(steps = [], onStepChange = () => {}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedAt = useRef(0);
  const baseElapsed = useRef(0);
  const lock = useRef(null);

  const releaseLock = useCallback(async () => {
    if (lock.current) {
      await lock.current.release();
      lock.current = null;
    }
  }, []);

  const requestLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { lock.current = await navigator.wakeLock.request('screen'); } catch { /* Wake lock is optional. */ }
    }
  }, []);

  const pause = useCallback(() => {
    if (!running) return;
    const current = elapsedSeconds(startedAt.current, baseElapsed.current);
    baseElapsed.current = current;
    setElapsed(current);
    setRunning(false);
    releaseLock();
  }, [releaseLock, running]);

  const start = useCallback(() => {
    if (running) return;
    startedAt.current = Date.now();
    setRunning(true);
    requestLock();
  }, [requestLock, running]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    setStepIndex(0);
    baseElapsed.current = 0;
    releaseLock();
  }, [releaseLock]);

  const skipStep = useCallback(() => {
    if (!steps.length || stepIndex >= steps.length) return;
    const current = steps[stepIndex].end;
    const nextIndex = Math.min(stepIndex + 1, steps.length);
    baseElapsed.current = current;
    startedAt.current = Date.now();
    setElapsed(current);
    setStepIndex(nextIndex);
    if (nextIndex === steps.length) {
      setRunning(false);
      releaseLock();
    }
    onStepChange();
  }, [onStepChange, releaseLock, stepIndex, steps]);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const current = elapsedSeconds(startedAt.current, baseElapsed.current);
      setElapsed(current);
      const next = steps.findIndex((step, index) => index >= stepIndex && current < step.end);
      const currentStep = next === -1 ? steps.length : next;
      if (currentStep !== stepIndex) {
        setStepIndex(currentStep);
        onStepChange();
      }
      if (steps.length && current >= steps[steps.length - 1].end) {
        baseElapsed.current = current;
        setRunning(false);
        releaseLock();
      }
    };
    const interval = setInterval(tick, 200);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible' && running) requestLock(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibilityChange); };
  }, [onStepChange, releaseLock, requestLock, running, stepIndex, steps]);

  useEffect(() => () => { releaseLock(); }, [releaseLock]);

  return { elapsed: Math.floor(elapsed), running, stepIndex, start, pause, reset, skipStep, finished: steps.length > 0 && elapsed >= steps[steps.length - 1].end };
}
