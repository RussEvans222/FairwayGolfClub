import { LightningElement, api, track } from 'lwc';
import getSessionParticipants from '@salesforce/apex/FairwaySessionConsoleController.getSessionParticipants';

export default class FairwaySessionParticipants extends LightningElement {
    @api recordId; // ServiceAppointment Id, injected by the record page

    @track participants = [];
    @track loading = true;

    _timer;

    connectedCallback() {
        this.load();
        this._timer = setInterval(() => this.load(), 30000);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    handleRefresh() { this.load(); }

    get hasParticipants() { return !this.loading && this.participants.length > 0; }
    get noParticipants()  { return !this.loading && this.participants.length === 0; }
    // Every row carries the same bayName (it's session-level, not per-player) —
    // surfaced here so the bay is visible up top without hunting through the
    // participant list, which was hard to spot on the plain page layout.
    get bayName() { return this.participants.length ? this.participants[0].bayName : null; }

    load() {
        if (!this.recordId) return;
        this.loading = true;
        getSessionParticipants({ serviceAppointmentId: this.recordId })
            .then(rows => { this.participants = (rows || []).map(p => this._decorate(p)); })
            .catch(() => { this.participants = []; })
            .finally(() => { this.loading = false; });
    }

    _decorate(p) {
        return {
            ...p,
            slotLabel: `Slot ${p.slot}`,
        };
    }
}
