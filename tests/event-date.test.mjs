import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { calendarDate, toDatabaseDate, isCalendarDate, formatEventDate, formatEventTime, chileToday, isEventFinished } from "../lib/event-date.mjs";

for (const zone of ["UTC", "America/Santiago", "America/New_York", "Pacific/Auckland"]) {
  test(`calendar lifecycle is independent of server/browser timezone: ${zone}`, () => {
    execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import {calendarDate,toDatabaseDate,formatEventDate,formatEventTime} from './lib/event-date.mjs';
      for (const day of ['2026-09-19','2026-09-05','2026-09-06','2026-09-07','2026-04-04','2026-04-05','2026-04-06','2024-02-29']) {
        const saved = toDatabaseDate(day);
        const response = JSON.parse(JSON.stringify({tentativeDate:saved,eventTime:'23:39'}));
        const edited = toDatabaseDate(calendarDate(response.tentativeDate));
        const approved = JSON.parse(JSON.stringify({date:edited,eventTime:response.eventTime}));
        assert.equal(calendarDate(approved.date),day);
        assert.equal(formatEventTime(approved.eventTime),'23:39 hrs.');
        assert.ok(formatEventDate(approved.date).includes(day.slice(8)));
      }
    `], { env: { ...process.env, TZ: zone }, stdio: "pipe" });
  });
}

test("legacy midnight UTC, Chilean midnight and noon preserve stored day", () => {
  for (const hour of ["00", "03", "04", "12", "15", "16"]) {
    const value = `2026-09-19T${hour}:00:00.000Z`;
    assert.equal(calendarDate(value), "2026-09-19");
    assert.equal(calendarDate(new Date(value)), "2026-09-19");
    assert.equal(formatEventDate(value), "19-09-2026");
  }
  assert.equal(formatEventDate("2026-09-19", { weekday: "long" }), "sÃ¡bado, 19-09-2026");
});

test("reject impossible dates and timestamp payloads", () => {
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "19-09-2026", "2026-09-19T00:00:00Z", "", null]) {
    assert.equal(isCalendarDate(value), false);
    assert.throws(() => toDatabaseDate(value), RangeError);
  }
});

test("Chile calendar follows DST without modifying event time", () => {
  assert.equal(chileToday(new Date("2026-09-19T02:59:59Z")), "2026-09-18");
  assert.equal(chileToday(new Date("2026-09-19T03:00:00Z")), "2026-09-19");
  assert.equal(chileToday(new Date("2026-09-06T04:00:00Z")), "2026-09-06");
  assert.equal(isEventFinished("2026-09-19", new Date("2026-09-20T02:59:59Z")), false);
  assert.equal(isEventFinished("2026-09-19", new Date("2026-09-20T03:00:00Z")), true);
  assert.equal(formatEventTime("23:39"), "23:39 hrs.");
});
