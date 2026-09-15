const GHANA_TIME_ZONE = "Africa/Accra";

export type GhanaClock = {
  date: string;
  time: string;
};

/** Returns an ISO-like local date and time for the business's Ghana timezone. */
export function getGhanaClock(now = new Date()): GhanaClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GHANA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}:${value("second")}`,
  };
}

/** A delivery window closes as soon as its configured start time is reached. */
export function isBeforeDeliveryCutoff(startTime: string, currentTime: string): boolean {
  return startTime > currentTime;
}
