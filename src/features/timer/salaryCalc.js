// yen per second for each work category
const RATE = {
  normal:           3600 / 3600,
  overtime:         4100 / 3600,
  lateNight:        4900 / 3600,
  sundayNormal:     5200 / 3600,
  sundayLateNight:  6000 / 3600,
};

function setHour(refDate, h) {
  const d = new Date(refDate);
  d.setHours(h, 0, 0, 0);
  return d.getTime();
}

function getRateKey(ms, isSunday) {
  const d = new Date(ms);
  const mins = d.getHours() * 60 + d.getMinutes();
  if (isSunday) return mins >= 22 * 60 ? 'sundayLateNight' : 'sundayNormal';
  if (mins >= 22 * 60) return 'lateNight';
  if (mins >= 18 * 60) return 'overtime';
  return 'normal';
}

function subtractIntervals(intervals, subStart, subEnd) {
  const result = [];
  for (const [s, e] of intervals) {
    if (subEnd <= s || subStart >= e) {
      result.push([s, e]);
    } else {
      if (s < subStart) result.push([s, subStart]);
      if (e > subEnd) result.push([subEnd, e]);
    }
  }
  return result;
}

function calcSegmentEarnings(startMs, endMs, isSunday) {
  if (startMs >= endMs) return { earnings: 0, seconds: {} };

  const refDate = new Date(startMs);
  const boundaries = [setHour(refDate, 18), setHour(refDate, 22), endMs + 1];

  const seconds = {};
  let earnings = 0;
  let cur = startMs;

  for (const b of boundaries) {
    if (cur >= endMs) break;
    const segEnd = Math.min(b, endMs);
    if (segEnd > cur) {
      const secs = (segEnd - cur) / 1000;
      const key = getRateKey(cur, isSunday);
      seconds[key] = (seconds[key] || 0) + secs;
      earnings += secs * RATE[key];
      cur = segEnd;
    }
  }

  return { earnings, seconds };
}

export function calculateEarnings(startTime, now, pauseIntervals, isSunday) {
  const startMs = startTime.getTime();
  const nowMs = now.getTime();

  let active = [[startMs, nowMs]];

  // auto break 12:00-13:00
  active = subtractIntervals(active, setHour(startTime, 12), setHour(startTime, 13));

  // manual pauses
  for (const p of pauseIntervals) {
    active = subtractIntervals(active, p.start.getTime(), p.end.getTime());
  }

  const totalSeconds = {};
  let totalEarnings = 0;

  for (const [s, e] of active) {
    const { earnings, seconds } = calcSegmentEarnings(s, e, isSunday);
    totalEarnings += earnings;
    for (const [k, v] of Object.entries(seconds)) {
      totalSeconds[k] = (totalSeconds[k] || 0) + v;
    }
  }

  return { earnings: totalEarnings, seconds: totalSeconds };
}

export function getWorkCategory(now, timerState, isSunday) {
  if (timerState === 'idle') return 'idle';
  if (timerState === 'ended') return 'ended';
  if (timerState === 'paused') return 'paused';

  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 12 * 60 && mins < 13 * 60) return 'autoBreak';
  if (isSunday) return mins >= 22 * 60 ? 'sundayLateNight' : 'sundayNormal';
  if (mins >= 22 * 60) return 'lateNight';
  if (mins >= 18 * 60) return 'overtime';
  return 'normal';
}

export function formatSeconds(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}時間 ${String(m).padStart(2, '0')}分`;
}

export const CATEGORY_LABEL = {
  dormant:          '休止中',
  normal:           '通常勤務中',
  overtime:         '普通残業中',
  lateNight:        '深夜残業中',
  sundayNormal:     '日曜休日勤務中',
  sundayLateNight:  '日曜深夜勤務中',
  autoBreak:        '昼休憩中',
  paused:           '休憩中',
};

export const CATEGORY_COLOR_VAR = {
  dormant:          '--status-break',
  normal:           '--status-normal',
  overtime:         '--status-overtime',
  lateNight:        '--status-late-night',
  sundayNormal:     '--status-sunday-normal',
  sundayLateNight:  '--status-sunday-late',
  autoBreak:        '--status-break',
  paused:           '--status-break',
};
