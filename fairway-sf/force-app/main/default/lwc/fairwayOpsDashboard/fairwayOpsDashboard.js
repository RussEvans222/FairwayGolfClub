import { LightningElement, track } from 'lwc';
import getTodaySessions from '@salesforce/apex/FairwayOpsDashboardController.getTodaySessions';
import getBayStatus from '@salesforce/apex/FairwayOpsDashboardController.getBayStatus';
import getDailyStats from '@salesforce/apex/FairwayOpsDashboardController.getDailyStats';

const STATUS_LABELS = {
    Scheduled:   'Scheduled',
    Dispatched:  'Checked In',
    'In Progress': 'Active',
    Completed:   'Done',
};

const BADGE_CLASSES = {
    Scheduled:   'badge badge-scheduled',
    Dispatched:  'badge badge-checkedin',
    'In Progress': 'badge badge-active',
    Completed:   'badge badge-done',
};

const BAY_STATUS_BADGE = {
    Active:    'bay-status-badge bay-active',
    Scheduled: 'bay-status-badge bay-scheduled',
    Done:      'bay-status-badge bay-done',
    Idle:      'bay-status-badge bay-idle',
};

export default class FairwayOpsDashboard extends LightningElement {
    @track sessions = [];
    @track bays = [];
    @track stats = { totalSessions: 0, checkedIn: 0, scheduled: 0, late: 0,
                     baysActive: 0, baysIdle: 0, usagePercent: 0, usageGoal: 10 };
    @track loadingSessions = true;
    @track loadingBays = true;
    _refreshTimer;

    get todayLabel() {
        return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    get noSessions() { return !this.loadingSessions && this.sessions.length === 0; }
    get totalBays() { return this.bays.length; }
    get lateClass() { return this.stats.late > 0 ? 'stat-value red' : 'stat-value'; }
    get usageBarStyle() {
        const pct = Math.min(100, this.stats.usagePercent || 0);
        return `width:${pct}%`;
    }

    connectedCallback() {
        this.loadAll();
        this._refreshTimer = setInterval(() => this.loadAll(), 60000);
    }
    disconnectedCallback() {
        clearInterval(this._refreshTimer);
    }

    handleRefresh() { this.loadAll(); }

    loadAll() {
        this.loadSessions();
        this.loadBays();
        getDailyStats().then(d => { this.stats = d; }).catch(() => {});
    }

    loadSessions() {
        this.loadingSessions = true;
        getTodaySessions()
            .then(rows => {
                this.sessions = rows.map(r => ({
                    ...r,
                    timeRange:   this._fmt(r.schedStart) + ' – ' + this._fmt(r.schedEnd),
                    statusLabel: STATUS_LABELS[r.status] || r.status,
                    badgeClass:  BADGE_CLASSES[r.status] || 'badge',
                    rowClass:    'session-row' + (r.isLate ? ' row-late' : r.isCheckedIn ? ' row-checkedin' : ''),
                }));
            })
            .catch(() => { this.sessions = []; })
            .finally(() => { this.loadingSessions = false; });
    }

    loadBays() {
        this.loadingBays = true;
        getBayStatus()
            .then(rows => {
                this.bays = rows.map(b => ({
                    ...b,
                    cardClass:        'bay-card bay-card-' + (b.appointmentStatus || 'idle').toLowerCase(),
                    statusBadgeClass: BAY_STATUS_BADGE[b.appointmentStatus] || 'bay-status-badge bay-idle',
                    syncClass:        b.dataSynced ? 'sync-ok' : 'sync-err',
                    syncLabel:        b.dataSynced ? '● Synced' : '● Offline',
                }));
            })
            .catch(() => { this.bays = []; })
            .finally(() => { this.loadingBays = false; });
    }

    _fmt(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
}
