const GHANA_TIME_ZONE = "Africa/Accra";
const NEXT_DAY_REOPEN_MINUTES = 17 * 60;

// Cutoffs agreed for the three regular delivery periods.
const CUTOFF_MINUTES_BY_START: Record<string, number> = {
  "06:30": 5 * 60 + 30,
  "09:30": 7 * 60 + 30,
  "16:30": 14 * 60 + 30,
};

type GhanaClock = {
  date: string;
  minutes: number;
};

function ghanaClock(now: Date): GhanaClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GHANA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: hour * 60 + minute,
  };
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export type DeliverySchedule = {
  deliveryDate: string;
  automaticallyAvailable: boolean;
};

/** Resolve a delivery period against the agreed Ghana-time ordering schedule. */
export function getDeliverySchedule(startTime: string, now = new Date()): DeliverySchedule {
  const clock = ghanaClock(now);

  // From 5 PM, every active period is available for the following day.
  if (clock.minutes >= NEXT_DAY_REOPEN_MINUTES) {
    return {
      deliveryDate: addDays(clock.date, 1),
      automaticallyAvailable: true,
    };
  }

  const normalizedStart = startTime.slice(0, 5);
  const cutoff = CUTOFF_MINUTES_BY_START[normalizedStart];

  return {
    deliveryDate: clock.date,
    // Unknown/custom periods remain controlled by their active flag and date
    // exception instead of being accidentally hidden by this fixed schedule.
    automaticallyAvailable: cutoff === undefined || clock.minutes < cutoff,
  };
}
