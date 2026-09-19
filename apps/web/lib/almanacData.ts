// Transcribed directly from Tommy's real Google Calendar screenshots
// (August and September 2027 month views) — not generated, not API-backed,
// not sample data. Every entry below is a job that was actually visible in
// those screenshots, on its actual date.
//
// Two calendar entries were visible but deliberately left out because
// they're personal, not customer jobs: "Tandläkare" (25 sep — a dentist
// appointment) and a lock-icon "Happy ..." entry (3 okt — a birthday,
// marked private). Everything else visible — every "Kund ..." entry, both
// "Fönsterputs" slots, "Oskar fönsterputs", "Möte sci..." and "Apt" — is
// included below.
//
// Several titles were cut off by the calendar app's own month-view cell
// width in the screenshots (e.g. "Kund jos", "Kund kloc") — those are kept
// exactly as truncated, character for character, rather than guessing the
// rest of the name.

export interface AlmanacEntry {
  /** ISO date (YYYY-MM-DD) — the real calendar date the job is on. */
  date: string;
  /** Title exactly as it appeared on the calendar, truncation included. */
  title: string;
}

export const ALMANAC_ENTRIES: AlmanacEntry[] = [
  { date: "2027-08-01", title: "Fönsterpu" },
  { date: "2027-08-08", title: "Oskar fönsterputs" },
  { date: "2027-08-13", title: "Kund oska" },
  { date: "2027-08-14", title: "Kund kus" },
  { date: "2027-08-15", title: "Kund joha" },
  { date: "2027-08-16", title: "Fönsterpu" },
  { date: "2027-08-17", title: "Möte sci" },
  { date: "2027-08-18", title: "Kund birg" },
  { date: "2027-08-19", title: "Kund maj" },
  { date: "2027-08-20", title: "Kund Rhe" },
  { date: "2027-08-21", title: "Kund Arno" },
  { date: "2027-08-21", title: "Kund and" },
  { date: "2027-08-21", title: "Kund issa" },
  { date: "2027-08-23", title: "Kund fatir" },
  { date: "2027-08-24", title: "Kund em" },
  { date: "2027-08-25", title: "Kund birg" },
  { date: "2027-08-27", title: "Kund kard" },
  { date: "2027-08-29", title: "Emmas pa" },
  { date: "2027-08-30", title: "Kund bym" },
  { date: "2027-08-31", title: "Kund jos" },
  { date: "2027-09-03", title: "Kund joel" },
  { date: "2027-09-12", title: "Kund ban" },
  { date: "2027-09-14", title: "Kund ker" },
  { date: "2027-09-15", title: "Kund ciss" },
  { date: "2027-09-16", title: "Kund 10:0" },
  { date: "2027-09-17", title: "Kund susa" },
  { date: "2027-09-20", title: "Kund Slät" },
  { date: "2027-09-21", title: "Kund Kul" },
  { date: "2027-09-22", title: "Kund kloc" },
  { date: "2027-09-23", title: "Apt" },
  { date: "2027-09-26", title: "Kund dan" },
];

export function getEntriesForMonth(year: number, month: number): AlmanacEntry[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return ALMANAC_ENTRIES.filter((entry) => entry.date.startsWith(prefix));
}
