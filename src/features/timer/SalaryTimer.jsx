import { useState } from 'react';
import { useTimer } from './useTimer';
import { formatSeconds, CATEGORY_LABEL, CATEGORY_COLOR_VAR } from './salaryCalc';
import styles from './SalaryTimer.module.css';

function formatYen(amount) {
  return `¥${Math.floor(amount).toLocaleString('ja-JP')}`;
}

function StatusBadge({ category }) {
  const color = `var(${CATEGORY_COLOR_VAR[category] ?? '--status-break'})`;
  return (
    <span className={styles.badge} style={{ background: color }}>
      {CATEGORY_LABEL[category] ?? category}
    </span>
  );
}

function BreakdownRow({ label, secs }) {
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownLabel}>{label}</span>
      <span className={styles.breakdownValue}>{formatSeconds(secs ?? 0)}</span>
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function SalaryTimer() {
  const {
    now, isDormant, category, earnings, seconds,
    isSunday, showPauseButton, manuallyPaused, startTime,
    customStartH, customStartM,
    pause, resume, setCustomStart, clearCustomStart,
  } = useTimer();

  const [showStartEdit, setShowStartEdit] = useState(false);
  const [editH, setEditH] = useState('09');
  const [editM, setEditM] = useState('00');

  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const hasCustomStart = customStartH !== null;
  const startLabel = `${pad2(hasCustomStart ? customStartH : 9)}:${pad2(hasCustomStart ? (customStartM ?? 0) : 0)}`;

  function handleStartEditOpen() {
    setEditH(pad2(hasCustomStart ? customStartH : 9));
    setEditM(pad2(hasCustomStart ? (customStartM ?? 0) : 0));
    setShowStartEdit(true);
  }

  function handleStartEditApply() {
    const h = parseInt(editH, 10);
    const m = parseInt(editM, 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      setCustomStart(h, m);
    }
    setShowStartEdit(false);
  }

  function handleStartEditReset() {
    clearCustomStart();
    setShowStartEdit(false);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <p className={styles.appTitle}>給与計算</p>
        <p className={styles.clock}>{timeStr}</p>
        <p className={styles.date}>{dateStr}{isSunday ? '（日曜）' : ''}</p>
      </header>

      <main className={styles.main}>
        {/* earnings card */}
        <div className={`${styles.card} ${isDormant ? styles.cardDormant : ''}`}>
          <p className={styles.cardLabel}>今日の推定税後給与</p>
          <p className={`${styles.amount} ${isDormant ? styles.amountMuted : ''}`}>
            {isDormant ? '¥ — — —' : formatYen(earnings)}
          </p>
          <StatusBadge category={category} />
          {isDormant && (
            <p className={styles.dormantNote}>9:00 より自動開始</p>
          )}
        </div>

        {/* breakdown */}
        {!isDormant && (
          <div className={styles.breakdownCard}>
            {isSunday ? (
              <>
                <BreakdownRow label="日曜休日勤務" secs={seconds.sundayNormal} />
                <BreakdownRow label="日曜深夜勤務" secs={seconds.sundayLateNight} />
              </>
            ) : (
              <>
                <BreakdownRow label="通常勤務" secs={seconds.normal} />
                <BreakdownRow label="普通残業" secs={seconds.overtime} />
                <BreakdownRow label="深夜残業" secs={seconds.lateNight} />
              </>
            )}
          </div>
        )}

        {/* custom start time */}
        {!isDormant && (
          <div className={styles.startTimeSection}>
            {!showStartEdit ? (
              <button className={styles.linkBtn} onClick={handleStartEditOpen}>
                本日の開始時間：{startLabel}{hasCustomStart ? ' (変更済)' : ''}
              </button>
            ) : (
              <div className={styles.startEditPanel}>
                <p className={styles.startEditLabel}>本日の勤務開始時間</p>
                <div className={styles.timeInputRow}>
                  <input
                    className={styles.timeInput}
                    type="number"
                    min="0"
                    max="23"
                    value={editH}
                    onChange={e => setEditH(e.target.value)}
                  />
                  <span className={styles.timeSep}>:</span>
                  <input
                    className={styles.timeInput}
                    type="number"
                    min="0"
                    max="59"
                    value={editM}
                    onChange={e => setEditM(e.target.value)}
                  />
                </div>
                <div className={styles.startEditActions}>
                  <button className={styles.btnApply} onClick={handleStartEditApply}>適用</button>
                  {hasCustomStart && (
                    <button className={styles.btnReset} onClick={handleStartEditReset}>9:00 に戻す</button>
                  )}
                  <button className={styles.btnCancel} onClick={() => setShowStartEdit(false)}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* pause button (18:00+) */}
      {showPauseButton && (
        <footer className={styles.footer}>
          {manuallyPaused
            ? <button className={styles.btnSecondary} onClick={resume}>再開</button>
            : <button className={styles.btnSecondary} onClick={pause}>一時停止</button>
          }
        </footer>
      )}
    </div>
  );
}
