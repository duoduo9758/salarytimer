import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { calculateEarnings } from './salaryCalc';

// Work day rolls over at 2:00 AM (not midnight)
function getWorkDateKey(now) {
  const d = new Date(now);
  if (d.getHours() < 2) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function makeTimeOnDate(dateRef, h, m) {
  const d = new Date(dateRef);
  if (h < 2) d.setDate(d.getDate() + 1); // e.g. 0:00-1:59 is "next calendar day" in the same work day
  d.setHours(h, m, 0, 0);
  return d;
}

export function useTimer() {
  const [now, setNow] = useState(new Date());
  const [customStartH, setCustomStartH] = useState(null);
  const [customStartM, setCustomStartM] = useState(null);
  const [pauseIntervals, setPauseIntervals] = useState([]);
  const [currentPauseStart, setCurrentPauseStart] = useState(null);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const workDateKeyRef = useRef(getWorkDateKey(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      const newKey = getWorkDateKey(n);
      // Daily reset at 2:00 AM boundary
      if (newKey !== workDateKeyRef.current) {
        workDateKeyRef.current = newKey;
        setCustomStartH(null);
        setCustomStartM(null);
        setPauseIntervals([]);
        setCurrentPauseStart(null);
        setManuallyPaused(false);
      }
      setNow(n);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const totalMins = now.getHours() * 60 + now.getMinutes();
  const isSunday = now.getDay() === 0;

  // App states
  const isDormant = totalMins >= 2 * 60 && totalMins < 9 * 60;
  const isAutoBreak = !isDormant && totalMins >= 12 * 60 && totalMins < 13 * 60;
  const showPauseButton = !isDormant && now.getHours() >= 18;

  // Effective start time for today's work
  const startTime = useMemo(() => {
    const d = new Date(now);
    if (d.getHours() < 2) d.setDate(d.getDate() - 1); // normalize to work day
    if (customStartH !== null) {
      d.setHours(customStartH, customStartM ?? 0, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customStartH, customStartM, workDateKeyRef.current]);

  const effectivePauses = useMemo(() => {
    if (manuallyPaused && currentPauseStart) {
      return [...pauseIntervals, { start: currentPauseStart, end: now }];
    }
    return pauseIntervals;
  }, [pauseIntervals, manuallyPaused, currentPauseStart, now]);

  const { earnings, seconds } = useMemo(() => {
    if (isDormant) return { earnings: 0, seconds: {} };
    return calculateEarnings(startTime, now, effectivePauses, isSunday);
  }, [isDormant, startTime, now, effectivePauses, isSunday]);

  // Current work category
  let category;
  if (isDormant) category = 'dormant';
  else if (manuallyPaused) category = 'paused';
  else if (isAutoBreak) category = 'autoBreak';
  else if (isSunday) category = totalMins >= 22 * 60 ? 'sundayLateNight' : 'sundayNormal';
  else if (totalMins >= 22 * 60) category = 'lateNight';
  else if (totalMins >= 18 * 60) category = 'overtime';
  else category = 'normal';

  const pause = useCallback(() => {
    setCurrentPauseStart(new Date());
    setManuallyPaused(true);
  }, []);

  const resume = useCallback(() => {
    setPauseIntervals(prev =>
      currentPauseStart ? [...prev, { start: currentPauseStart, end: new Date() }] : prev
    );
    setCurrentPauseStart(null);
    setManuallyPaused(false);
  }, [currentPauseStart]);

  const setCustomStart = useCallback((h, m) => {
    setCustomStartH(h);
    setCustomStartM(m);
    setPauseIntervals([]);
    setCurrentPauseStart(null);
    setManuallyPaused(false);
  }, []);

  const clearCustomStart = useCallback(() => {
    setCustomStartH(null);
    setCustomStartM(null);
    setPauseIntervals([]);
    setCurrentPauseStart(null);
    setManuallyPaused(false);
  }, []);

  return {
    now, isDormant, isAutoBreak, category, earnings, seconds,
    isSunday, showPauseButton, manuallyPaused, startTime,
    customStartH, customStartM,
    pause, resume, setCustomStart, clearCustomStart,
  };
}
