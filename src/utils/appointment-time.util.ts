const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Combines `Appointment.appointment_date` (a `@db.Date` column — UTC-midnight
 * anchored, representing an IST calendar day) with `DoctorAvailability.start_time`
 * (stored as `new Date('1970-01-01T${HH:MM}:00Z')`, where HH:MM is the admin's
 * typed IST wall-clock time — there is no timezone selector on that form) into
 * the true absolute UTC instant the appointment actually starts.
 *
 * Neither source value is a "real" UTC instant on its own — both only encode
 * their meaningful digits via `getUTC*()` accessors. This is the ONE place that
 * combination happens; every other call site (reminder sweep, same-day booking
 * hook, doctor shift notice) must use this function rather than re-deriving the
 * logic, to avoid reintroducing the class of UTC/IST bugs already fixed
 * elsewhere in this codebase (see the receptionist History page date-range fix).
 */
export function getAppointmentStartInstantUTC(appointmentDate: Date, slotStartTime: Date): Date {
    const year = appointmentDate.getUTCFullYear();
    const month = appointmentDate.getUTCMonth();
    const day = appointmentDate.getUTCDate();
    const hours = slotStartTime.getUTCHours();
    const minutes = slotStartTime.getUTCMinutes();

    // Y-M-D HH:MM here is intended as IST wall-clock — subtract the IST offset
    // from the naive UTC construction to get the true UTC instant.
    return new Date(Date.UTC(year, month, day, hours, minutes) - IST_OFFSET_MS);
}

/**
 * Same combination as `getAppointmentStartInstantUTC`, but for `end_time` —
 * the true UTC instant a slot closes. Used for check-in window gating and
 * the no-show sweep.
 */
export function getAppointmentEndInstantUTC(appointmentDate: Date, slotEndTime: Date): Date {
    const year = appointmentDate.getUTCFullYear();
    const month = appointmentDate.getUTCMonth();
    const day = appointmentDate.getUTCDate();
    const hours = slotEndTime.getUTCHours();
    const minutes = slotEndTime.getUTCMinutes();

    return new Date(Date.UTC(year, month, day, hours, minutes) - IST_OFFSET_MS);
}

/**
 * Today's IST calendar day, encoded the same UTC-midnight-anchored way
 * `Appointment.appointment_date` is (a `@db.Date` column) — so the two can be
 * compared directly with `<`/`>=`/`===` without a timezone bug. Used for the
 * reschedule "not on the day of" cutoff.
 */
export function getTodayAsAppointmentDateUTC(): Date {
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
}

/**
 * Formats a `DoctorAvailability.start_time`/`end_time`-style value ("time of
 * day" encoded via getUTC* accessors, see above) as a 12-hour clock string —
 * e.g. "9:00 AM". Used for WhatsApp reminder / shift-notice message content.
 */
export function formatSlotTime12Hour(date: Date): string {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}
