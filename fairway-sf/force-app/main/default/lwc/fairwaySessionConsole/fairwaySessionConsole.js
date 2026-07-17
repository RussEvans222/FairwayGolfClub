import { LightningElement, track } from 'lwc';
import getActiveSessions from '@salesforce/apex/FairwaySessionConsoleController.getActiveSessions';
import endSession      from '@salesforce/apex/FairwaySessionConsoleController.endSession';
import restartSession  from '@salesforce/apex/FairwaySessionConsoleController.restartSession';
import extendSession   from '@salesforce/apex/FairwaySessionConsoleController.extendSession';
import changeStatus    from '@salesforce/apex/FairwaySessionConsoleController.changeStatus';

const BADGE = {
    Scheduled:    'badge badge-scheduled',
    Dispatched:   'badge badge-checkedin',
    'In Progress':'badge badge-active',
    Completed:    'badge badge-done',
};

export default class FairwaySessionConsole extends LightningElement {
    @track sessions = [];
    @track loading  = true;
    @track toast    = { visible: false, message: '', cssClass: '' };

    _timer;
    _busyIds = new Set();

    connectedCallback() {
        this.load();
        this._timer = setInterval(() => this.load(), 30000);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    handleRefresh() { this.load(); }

    get noSessions() { return !this.loading && this.sessions.length === 0; }

    load() {
        this.loading = true;
        getActiveSessions()
            .then(rows => {
                const now = Date.now();
                this.sessions = rows.map(s => this._decorate(s, now));
            })
            .catch(() => { this.sessions = []; })
            .finally(() => { this.loading = false; });
    }

    _decorate(s, now) {
        const endMs    = s.schedEnd  ? new Date(s.schedEnd).getTime()  : null;
        const startMs  = s.schedStart ? new Date(s.schedStart).getTime() : null;
        const totalMs  = (endMs && startMs) ? endMs - startMs : null;
        const elapsedMs = startMs ? Math.max(0, now - startMs) : 0;
        const pct      = totalMs ? Math.min(100, Math.round(elapsedMs / totalMs * 100)) : 0;

        const mins = s.minutesRemaining ?? 0;
        const absMins = Math.abs(mins);
        const timerLabel = mins >= 0
            ? `${absMins} min left`
            : `${absMins} min over`;

        const isOvertime = s.isOvertime || false;

        return {
            ...s,
            initial:      (s.contactName || 'G')[0].toUpperCase(),
            badgeClass:   BADGE[s.status] || 'badge',
            cardClass:    'session-card' + (isOvertime ? ' card-overtime' : ''),
            timerLabel,
            timerClass:   'timer' + (isOvertime ? ' timer-over' : ''),
            progressStyle:`width:${pct}%`,
            schedStart:   this._fmtTime(s.schedStart),
            schedEnd:     this._fmtTime(s.schedEnd),
            isOvertime,
            busy:         this._busyIds.has(s.appointmentId),
        };
    }

    _fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    handleEnd(evt) {
        const id = evt.currentTarget.dataset.id;
        this._run(id, endSession({ appointmentId: id }), 'Session ended.');
    }

    handleRestart(evt) {
        const id = evt.currentTarget.dataset.id;
        this._run(id, restartSession({ appointmentId: id }), 'Session restarted.');
    }

    handleExtend(evt) {
        const id   = evt.currentTarget.dataset.id;
        const mins = parseInt(evt.currentTarget.dataset.mins, 10);
        this._run(id, extendSession({ appointmentId: id, minutes: mins }), `+${mins} min added.`);
    }

    handleStatusChange(evt) {
        const id     = evt.currentTarget.dataset.id;
        const status = evt.target.value;
        if (!status) return;
        evt.target.value = '';
        this._run(id, changeStatus({ appointmentId: id, newStatus: status }), `Status → ${status}`);
    }

    _run(id, promise, successMsg) {
        this._busyIds.add(id);
        this._refreshBusy();
        promise
            .then(() => {
                this._showToast(successMsg, true);
                this.load();
            })
            .catch(err => {
                const msg = err?.body?.message || 'Something went wrong.';
                this._showToast(msg, false);
            })
            .finally(() => {
                this._busyIds.delete(id);
                this._refreshBusy();
            });
    }

    _refreshBusy() {
        this.sessions = this.sessions.map(s => ({
            ...s,
            busy: this._busyIds.has(s.appointmentId),
        }));
    }

    _showToast(message, success) {
        this.toast = {
            visible:  true,
            message,
            cssClass: 'toast ' + (success ? 'toast-success' : 'toast-error'),
        };
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { this.toast = { ...this.toast, visible: false }; }, 3000);
    }
}
