import { LightningElement, track } from 'lwc';
import getSessionsForDate from '@salesforce/apex/FairwayOpsDashboardController.getSessionsForDate';
import getDailyStats      from '@salesforce/apex/FairwayOpsDashboardController.getDailyStats';
import getBayStatus       from '@salesforce/apex/FairwayOpsDashboardController.getBayStatus';
import getOperatingHours  from '@salesforce/apex/FairwayOpsDashboardController.getOperatingHours';
import changeStatus       from '@salesforce/apex/FairwaySessionConsoleController.changeStatus';

const BADGE = {
    Scheduled:     'event-block badge-scheduled',
    Dispatched:    'event-block badge-checkedin',
    'In Progress': 'event-block badge-active',
    Completed:     'event-block badge-done',
};

const STATUS_LABEL = {
    Scheduled:     'Upcoming',
    Dispatched:    'Checked In',
    'In Progress': 'Active',
    Completed:     'Done',
};

// "Checking in soon" highlight window, in minutes.
const SOON_WINDOW_MIN = 20;

// Live-refresh cadence while viewing today — matches fairwaySessionConsole's
// polling interval so the whole ops surface feels consistently "real time."
const POLL_MS = 30000;

function isoDate(d) {
    return d.toISOString().slice(0, 10);
}

function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
}

export default class FairwayDailySchedule extends LightningElement {
    @track selectedDate = isoDate(new Date());
    @track sessions     = [];
    @track bays         = [];
    @track hours        = null; // { startMinutes, endMinutes }
    @track stats        = null;
    @track loading      = true;
    @track checkingInId = null;
    @track nowMinutes   = minutesOfDay(new Date());

    _todayIso = isoDate(new Date());
    _timer;

    connectedCallback() {
        this.load();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._timer = setInterval(() => {
            this.nowMinutes = minutesOfDay(new Date());
            if (this.isToday) this.load();
        }, POLL_MS);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    get dateLabel() {
        // Interpret as local calendar date, not UTC midnight, to avoid an
        // off-by-one when rendered in a timezone behind UTC.
        const [y, m, d] = this.selectedDate.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
    }

    get isToday() { return this.selectedDate === this._todayIso; }

    get soonSession() {
        if (!this.isToday) return null;
        const now = Date.now();
        const upcoming = this.sessions
            .filter(s => s.status === 'Scheduled')
            .map(s => ({ ...s, _startMs: new Date(s.schedStart).getTime() }))
            .filter(s => s._startMs - now <= SOON_WINDOW_MIN * 60000 && s._startMs - now > -5 * 60000)
            .sort((a, b) => a._startMs - b._startMs);
        return upcoming.length ? upcoming[0] : null;
    }

    get revenueLabel() {
        return this.stats ? `$${Number(this.stats.totalRevenue || 0).toFixed(2)}` : '—';
    }

    get utilizationLabel() {
        return this.stats ? `${this.stats.usagePercent}%` : '—';
    }

    // ── Calendar grid geometry ───────────────────────────────────────────────

    get hasHours() { return this.hours != null; }

    get totalMinutes() {
        return this.hours ? Math.max(1, this.hours.endMinutes - this.hours.startMinutes) : 1;
    }

    get hourMarkers() {
        if (!this.hours) return [];
        const marks = [];
        const startHour = Math.ceil(this.hours.startMinutes / 60);
        const endHour   = Math.floor(this.hours.endMinutes / 60);
        for (let h = startHour; h <= endHour; h++) {
            const mins = h * 60;
            marks.push({
                key: h,
                label: this._fmtHour(h),
                style: `top:${this._pct(mins)}%`,
            });
        }
        return marks;
    }

    get showNowLine() {
        return this.isToday && this.hours != null
            && this.nowMinutes >= this.hours.startMinutes
            && this.nowMinutes <= this.hours.endMinutes;
    }

    get nowLineStyle() {
        return `top:${this._pct(this.nowMinutes)}%`;
    }

    get columns() {
        if (!this.hours) return [];
        return this.bays.map(b => ({
            bayId: b.bayId,
            bayName: b.bayName,
            events: this.sessions
                .filter(s => s.bayResourceId === b.bayId)
                .map(s => this._toEvent(s)),
        }));
    }

    get noBays() { return !this.loading && this.bays.length === 0; }

    _toEvent(s) {
        const start = minutesOfDay(new Date(s.schedStart));
        const rawEnd = s.schedEnd ? minutesOfDay(new Date(s.schedEnd)) : start + 60;
        const end = rawEnd > start ? rawEnd : start + 30; // guard against overnight/zero-length rows
        const top = this._pct(start);
        const height = Math.max(2, this._pct(end) - top);
        return {
            key: s.appointmentId,
            appointmentId: s.appointmentId,
            contactName: s.contactName,
            statusLabel: s.statusLabel,
            timeRange: s.timeRange,
            cssClass: BADGE[s.status] || 'event-block',
            style: `top:${top}%;height:${height}%`,
        };
    }

    _pct(minutes) {
        if (!this.hours) return 0;
        const clamped = Math.min(Math.max(minutes, this.hours.startMinutes), this.hours.endMinutes);
        return ((clamped - this.hours.startMinutes) / this.totalMinutes) * 100;
    }

    _fmtHour(h) {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return `${hour12} ${period}`;
    }

    load() {
        this.loading = true;
        // getSessionsForDate/getOperatingHours take an Apex Date; passing a
        // plain 'YYYY-MM-DD' string is the documented way to satisfy that
        // from an imperative @salesforce/apex call.
        Promise.all([
            getSessionsForDate({ d: this.selectedDate }),
            getDailyStats(),
            getBayStatus(),
            getOperatingHours({ d: this.selectedDate }),
        ])
            .then(([rows, stats, bayRows, hours]) => {
                this.sessions = rows.map(r => this._decorate(r));
                this.stats = stats;
                this.bays = bayRows.map(b => ({ bayId: b.bayId, bayName: b.bayName }));
                this.hours = hours;
            })
            .catch(() => {
                this.sessions = [];
                this.stats = null;
                this.bays = [];
                this.hours = null;
            })
            .finally(() => { this.loading = false; });
    }

    _decorate(s) {
        return {
            ...s,
            statusLabel: STATUS_LABEL[s.status] || s.status,
            timeRange: `${this._fmtTime(s.schedStart)} – ${this._fmtTime(s.schedEnd)}`,
        };
    }

    _fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // ── Date nav ─────────────────────────────────────────────────────────────
    handlePrevDay()  { this._shiftDate(-1); }
    handleNextDay()  { this._shiftDate(1); }
    handleToday()    { this.selectedDate = this._todayIso; this.load(); }

    _shiftDate(days) {
        const [y, m, d] = this.selectedDate.split('-').map(Number);
        const next = new Date(y, m - 1, d);
        next.setDate(next.getDate() + days);
        this.selectedDate = isoDate(next);
        this.load();
    }

    // ── Check-in ─────────────────────────────────────────────────────────────
    handleCheckIn(evt) {
        const id = evt.currentTarget.dataset.id;
        this.checkingInId = id;
        changeStatus({ appointmentId: id, newStatus: 'Dispatched' })
            .then(() => this.load())
            .finally(() => { this.checkingInId = null; });
    }
}
