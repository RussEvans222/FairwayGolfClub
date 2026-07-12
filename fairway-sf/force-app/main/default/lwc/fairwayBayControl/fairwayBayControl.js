import { LightningElement, api, track } from 'lwc';
import getBaySession   from '@salesforce/apex/FairwaySessionConsoleController.getBaySession';
import endSession       from '@salesforce/apex/FairwaySessionConsoleController.endSession';
import restartSession   from '@salesforce/apex/FairwaySessionConsoleController.restartSession';
import extendSession    from '@salesforce/apex/FairwaySessionConsoleController.extendSession';
import changeStatus     from '@salesforce/apex/FairwaySessionConsoleController.changeStatus';

const BADGE = {
    Scheduled:     'badge badge-scheduled',
    Dispatched:    'badge badge-checkedin',
    'In Progress': 'badge badge-active',
    Completed:     'badge badge-done',
};

export default class FairwayBayControl extends LightningElement {
    @api recordId; // ServiceResource Id, injected by the record page

    @track session = null;
    @track loading = true;
    @track busy    = false;
    @track toast   = { visible: false, message: '', cssClass: '' };

    _timer;

    connectedCallback() {
        this.load();
        this._timer = setInterval(() => this.load(), 30000);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    handleRefresh() { this.load(); }

    get hasSession() { return !this.loading && this.session != null; }
    get noSession()  { return !this.loading && this.session == null; }

    load() {
        if (!this.recordId) return;
        this.loading = true;
        getBaySession({ serviceResourceId: this.recordId })
            .then(dto => { this.session = dto ? this._decorate(dto) : null; })
            .catch(() => { this.session = null; })
            .finally(() => { this.loading = false; });
    }

    _decorate(s) {
        const endMs   = s.schedEnd  ? new Date(s.schedEnd).getTime()  : null;
        const startMs = s.schedStart ? new Date(s.schedStart).getTime() : null;
        const now     = Date.now();
        const totalMs = (endMs && startMs) ? endMs - startMs : null;
        const elapsedMs = startMs ? Math.max(0, now - startMs) : 0;
        const pct = totalMs ? Math.min(100, Math.round(elapsedMs / totalMs * 100)) : 0;

        const mins = s.minutesRemaining ?? 0;
        const absMins = Math.abs(mins);
        const isOvertime = s.isOvertime || false;
        const hh = Math.floor(absMins / 60);
        const mm = absMins % 60;
        const countdown = `${hh > 0 ? hh + ':' : ''}${String(mm).padStart(2, '0')}${hh > 0 ? '' : ' min'}`;

        return {
            ...s,
            badgeClass:    BADGE[s.status] || 'badge',
            timerClass:    'timer' + (isOvertime ? ' timer-over' : ''),
            countdown,
            isOvertime,
            progressStyle: `width:${pct}%`,
            schedStartLabel: this._fmtTime(s.schedStart),
            schedEndLabel:   this._fmtTime(s.schedEnd),
            partySizeLabel:  s.partySize ? `${s.partySize} Player${s.partySize === 1 ? '' : 's'}` : '—',
            rateAmountLabel: s.ratePerSession != null ? `$${Number(s.ratePerSession).toFixed(2)} / session` : '—',
            sessionTotalLabel: s.sessionTotal != null ? `$${Number(s.sessionTotal).toFixed(2)}` : '$0.00',
        };
    }

    _fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    handleEnd() {
        this._run(endSession({ appointmentId: this.session.appointmentId }), 'Session ended.');
    }

    handleRestart() {
        this._run(restartSession({ appointmentId: this.session.appointmentId }), 'Session restarted.');
    }

    handleExtend(evt) {
        const mins = parseInt(evt.currentTarget.dataset.mins, 10);
        this._run(
            extendSession({ appointmentId: this.session.appointmentId, minutes: mins }),
            `+${mins} min added.`
        );
    }

    handleStatusChange(evt) {
        const status = evt.target.value;
        if (!status) return;
        evt.target.value = '';
        this._run(
            changeStatus({ appointmentId: this.session.appointmentId, newStatus: status }),
            `Status → ${status}`
        );
    }

    handlePrintBill() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        window.print();
    }

    _run(promise, successMsg) {
        this.busy = true;
        promise
            .then(() => {
                this._showToast(successMsg, true);
                this.load();
            })
            .catch(err => {
                const msg = err?.body?.message || 'Something went wrong.';
                this._showToast(msg, false);
            })
            .finally(() => { this.busy = false; });
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
