import { LightningElement, track } from 'lwc';
import getDailyStats   from '@salesforce/apex/FairwayOpsDashboardController.getDailyStats';
import getBayStatus    from '@salesforce/apex/FairwayOpsDashboardController.getBayStatus';
import getChannelSplit from '@salesforce/apex/FairwayOpsDashboardController.getChannelSplit';

const TOP_BAYS_COUNT = 5;

export default class FairwayBusinessStats extends LightningElement {
    @track stats   = null;
    @track channel = null;
    @track topBays = [];
    @track loading = true;

    connectedCallback() {
        this.load();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._timer = setInterval(() => this.load(), 60000);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    handleRefresh() { this.load(); }

    load() {
        this.loading = true;
        Promise.all([getDailyStats(), getBayStatus(), getChannelSplit()])
            .then(([stats, bays, channel]) => {
                this.stats = stats;
                this.channel = channel;
                this.topBays = [...bays]
                    .sort((a, b) => (b.revenueToday || 0) - (a.revenueToday || 0))
                    .slice(0, TOP_BAYS_COUNT)
                    .map(b => ({ ...b, revenueLabel: `$${Number(b.revenueToday || 0).toFixed(2)}` }));
            })
            .catch(() => { this.stats = null; this.channel = null; this.topBays = []; })
            .finally(() => { this.loading = false; });
    }

    get revenueLabel() {
        return this.stats ? `$${Number(this.stats.totalRevenue || 0).toFixed(2)}` : '—';
    }

    get utilizationLabel() {
        return this.stats ? `${this.stats.usagePercent}%` : '—';
    }

    get utilizationBarStyle() {
        return `width:${this.stats ? this.stats.usagePercent : 0}%`;
    }

    get walkInPercentLabel() {
        return this.channel ? `${this.channel.walkInPercent}%` : '—';
    }

    get bookedPercentLabel() {
        return this.channel ? `${this.channel.bookedPercent}%` : '—';
    }

    get channelHasData() {
        return this.channel && (this.channel.walkInCount + this.channel.bookedCount) > 0;
    }

    // ── Operational health checklist — composed from stats already on hand,
    // no new tracking invented. dataSynced stays green until real
    // Simulator_Bay__c<->ServiceResource sync data exists (known gap).
    get healthChecks() {
        if (!this.stats) return [];
        const allSynced = this.topBays.every(b => b.dataSynced !== false);
        const turningOver = this.stats.totalSessions === 0 || this.stats.baysActive > 0;
        return [
            { label: 'No overdue check-ins', ok: (this.stats.late || 0) === 0 },
            { label: 'Bays turning over on schedule', ok: turningOver },
            { label: 'Bay data synced', ok: allSynced },
        ].map(c => ({ ...c, cssClass: 'health-item' + (c.ok ? ' health-ok' : ' health-bad'), icon: c.ok ? '✓' : '!' }));
    }
}
