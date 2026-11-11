const GHANA_TIME_ZONE = "Africa/Accra";

export const DELIVERY_WINDOW_LABEL = "6:30 AM – 7:15 AM";
export const DELIVERY_START_TIME = "06:30";
export const DELIVERY_END_TIME = "07:15";
export const ORDER_OPEN_TIME = "17:00";
export const ORDER_CUTOFF_TIME = "05:45";

// Sunday (0) through Friday (5). Saturday is the weekly rest day.
const SERVICE_DAYS = new Set([0, 1, 2, 3, 4, 5]);

type GhanaClock = { date: string; instant: number };

function ghanaClock(now: Date): GhanaClock {
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
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const instant = Date.UTC(
    Number(value("year")),
    Number(value("month")) - 1,
    Number(value("day")),
    Number(value("hour")),
    Number(value("minute")),
    Number(value("second")),
  );
  return { date, instant };
}

function dateAt(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, 0);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isServiceDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  return SERVICE_DAYS.has(new Date(Date.UTC(year, month - 1, day)).getUTCDay());
}

function serviceWindow(deliveryDate: string) {
  return {
    opensAt: dateAt(addDays(deliveryDate, -1), ORDER_OPEN_TIME),
    closesAt: dateAt(deliveryDate, ORDER_CUTOFF_TIME),
  };
}

export type OrderSchedule = {
  deliveryDate: string;
  orderingOpen: boolean;
  opensAt: string;
  closesAt: string;
  windowLabel: string;
};

/** Resolve the current or next ordering window in Ghana time. */
export function getOrderSchedule(now = new Date()): OrderSchedule {
  const clock = ghanaClock(now);
  let next: OrderSchedule | null = null;

  for (let offset = 0; offset <= 8; offset += 1) {
    const deliveryDate = addDays(clock.date, offset);
    if (!isServiceDate(deliveryDate)) continue;
    const window = serviceWindow(deliveryDate);
    const schedule: OrderSchedule = {
      deliveryDate,
      orderingOpen: clock.instant >= window.opensAt && clock.instant < window.closesAt,
      opensAt: new Date(window.opensAt).toISOString(),
      closesAt: new Date(window.closesAt).toISOString(),
      windowLabel: DELIVERY_WINDOW_LABEL,
    };
    if (schedule.orderingOpen) return schedule;
    if (window.opensAt > clock.instant && !next) next = schedule;
  }

  if (next) return next;
  throw new Error("Could not resolve the next Einyornose service day.");
}

export type DeliverySchedule = { deliveryDate: string; automaticallyAvailable: boolean };

/** Compatibility wrapper used by the control center. */
export function getDeliverySchedule(_startTime: string, now = new Date()): DeliverySchedule {
  const schedule = getOrderSchedule(now);
  return {
    deliveryDate: schedule.deliveryDate,
    automaticallyAvailable: schedule.orderingOpen,
  };
}
