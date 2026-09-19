// Single source of truth for Forsbergs Fönsterputs booking/job data — both
// the Bokningar panel UI and Eira's voice briefing ("öppna bokningar") read
// from these exact same functions, so what she says on request always
// matches what's on screen. Past vs. upcoming is computed from the real
// clock every time these are called, never hardcoded, so a job only ever
// counts as "past" once its own date/time has actually elapsed.
//
// This still only has real data for today's 3 scheduled jobs (the same
// ones the panel already showed before this file existed) — no invented
// bookings, customers, locations, services, or prices. Fields that don't
// exist in the source data are simply left undefined; consumers must not
// invent placeholder values for them.

export interface BookingJob {
  id: string;
  customer: string;
  /** Real, comparable date+time — this, not dateLabel, is what past/
   * upcoming classification is actually computed from. */
  date: Date;
  dateLabel: string;
  timeLabel: string;
  location?: string;
  service?: string;
  price?: number;
  status?: "Bekräftad" | "Väntar";
}

function buildTodaysJobs(): BookingJob[] {
  const today = new Date();
  today.setSeconds(0, 0);

  function at(hours: number, minutes: number): Date {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  return [
    {
      id: "booking-nilsson",
      customer: "Nilsson AB",
      date: at(10, 0),
      dateLabel: "Idag",
      timeLabel: "10:00",
      status: "Bekräftad",
    },
    {
      id: "booking-akesson",
      customer: "Familjen Åkesson",
      date: at(14, 0),
      dateLabel: "Idag",
      timeLabel: "14:00",
      status: "Bekräftad",
    },
    {
      id: "booking-persson",
      customer: "Persson Fastigheter",
      date: at(16, 30),
      dateLabel: "Idag",
      timeLabel: "16:30",
      status: "Väntar",
    },
  ];
}

/** Every job this prototype has data for, today's full schedule. */
export function getAllBookings(): BookingJob[] {
  return buildTodaysJobs();
}

/** Jobs whose date/time has already passed, most recent first. */
export function getPastBookings(): BookingJob[] {
  const now = Date.now();
  return getAllBookings()
    .filter((job) => job.date.getTime() < now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Jobs still ahead, chronologically soonest first. */
export function getUpcomingBookings(): BookingJob[] {
  const now = Date.now();
  return getAllBookings()
    .filter((job) => job.date.getTime() >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The N nearest upcoming jobs — the same priority queue the panel's
 * "KOMMANDE JOBB" section shows and Eira's voice briefing speaks. */
export function getNextBookings(count = 3): BookingJob[] {
  return getUpcomingBookings().slice(0, count);
}

// Aggregate week figures carried over from the original mock data — not
// derivable from the 3 itemized jobs above, so kept as their own static
// prototype numbers, same as the rest of this app's mock data files.
export const bookingWeekStats = {
  weekCount: 17,
  estimatedValue: 84500,
  currency: "kr",
};

/** The exact sentence Eira speaks for "öppna bokningar" — built fresh from
 * getNextBookings() every time, from the same data the panel just rendered,
 * never a canned string with placeholder names. */
export function getBookingsBriefing(): string {
  const jobs = getNextBookings(3);

  if (jobs.length === 0) {
    return "Opening bookings, sir. There are no upcoming bookings right now.";
  }

  const describe = (job: BookingJob) => `${job.customer} at ${job.timeLabel}`;

  if (jobs.length === 1) {
    return `Opening bookings, sir. Your next job is ${describe(jobs[0])}.`;
  }

  const list = jobs.map(describe);
  const joined =
    list.length === 2 ? `${list[0]} and ${list[1]}` : `${list[0]}, ${list[1]}, and ${list[2]}`;
  const countWord = list.length === 2 ? "two" : "three";
  return `Opening bookings, sir. Your next ${countWord} jobs are ${joined}.`;
}
