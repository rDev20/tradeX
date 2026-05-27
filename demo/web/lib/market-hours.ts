// NSE market hours: Mon-Fri 09:15 - 15:30 IST (UTC+5:30)
// Holidays are ignored in this demo.

const IST_OFFSET_MIN = 330; // +5:30

export type MarketState =
  | { state: "open"; openedAt: Date; closesAt: Date }
  | { state: "closed"; lastClose: Date | null; nextOpen: Date };

function toIST(d: Date): Date {
  return new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
}

function fromIST(istDate: Date): Date {
  return new Date(istDate.getTime() - IST_OFFSET_MIN * 60_000);
}

function setIST(year: number, month: number, day: number, hour: number, minute: number): Date {
  // build a "wall-clock IST" date as if it were UTC, then subtract the offset to get the real UTC instant
  const istWall = new Date(Date.UTC(year, month, day, hour, minute, 0));
  return new Date(istWall.getTime() - IST_OFFSET_MIN * 60_000);
}

function isWeekday(istDate: Date): boolean {
  const dow = istDate.getUTCDay(); // we treat shifted IST as UTC
  return dow >= 1 && dow <= 5;
}

function nextWeekday(istDate: Date): Date {
  let d = istDate;
  for (let i = 0; i < 7; i++) {
    d = new Date(d.getTime() + 24 * 60 * 60_000);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) return d;
  }
  return d;
}

export function marketStatus(now: Date = new Date()): MarketState {
  const ist = toIST(now);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const todayOpen = setIST(y, m, d, 9, 15);
  const todayClose = setIST(y, m, d, 15, 30);

  if (isWeekday(ist) && now >= todayOpen && now < todayClose) {
    return { state: "open", openedAt: todayOpen, closesAt: todayClose };
  }

  // closed — figure out lastClose and nextOpen
  let lastClose: Date | null = null;
  let nextOpen: Date;

  if (isWeekday(ist) && now >= todayClose) {
    lastClose = todayClose;
    // next open: tomorrow 09:15 if tomorrow is a weekday, else next weekday
    const tomorrowIST = new Date(ist.getTime() + 24 * 60 * 60_000);
    if (isWeekday(tomorrowIST)) {
      nextOpen = setIST(
        tomorrowIST.getUTCFullYear(),
        tomorrowIST.getUTCMonth(),
        tomorrowIST.getUTCDate(),
        9,
        15,
      );
    } else {
      const nw = nextWeekday(tomorrowIST);
      nextOpen = setIST(nw.getUTCFullYear(), nw.getUTCMonth(), nw.getUTCDate(), 9, 15);
    }
  } else if (isWeekday(ist) && now < todayOpen) {
    // pre-market today
    nextOpen = todayOpen;
    // last close was previous weekday's 15:30
    let prev = new Date(ist.getTime() - 24 * 60 * 60_000);
    while (!(prev.getUTCDay() >= 1 && prev.getUTCDay() <= 5)) {
      prev = new Date(prev.getTime() - 24 * 60 * 60_000);
    }
    lastClose = setIST(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate(), 15, 30);
  } else {
    // weekend — last close was Friday 15:30, next open Monday 09:15
    let prev = ist;
    while (!(prev.getUTCDay() >= 1 && prev.getUTCDay() <= 5)) {
      prev = new Date(prev.getTime() - 24 * 60 * 60_000);
    }
    lastClose = setIST(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate(), 15, 30);
    const nw = nextWeekday(ist);
    nextOpen = setIST(nw.getUTCFullYear(), nw.getUTCMonth(), nw.getUTCDate(), 9, 15);
  }

  return { state: "closed", lastClose, nextOpen };
}

export function formatIST(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatTimeRemaining(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || (!days && !hours)) parts.push(`${mins}m`);
  return parts.join(" ");
}
