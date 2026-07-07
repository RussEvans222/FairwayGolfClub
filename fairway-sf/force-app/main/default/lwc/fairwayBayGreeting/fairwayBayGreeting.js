import { LightningElement, api, track } from 'lwc';
import getBayGreeting from '@salesforce/apex/FairwayOpsDashboardController.getBayGreeting';

export default class FairwayBayGreeting extends LightningElement {
    @api appointmentId;   // passed in via flexipage config or URL param
    @track data = null;
    @track isLoading = true;

    connectedCallback() {
        if (this.appointmentId) {
            this.load();
        } else {
            // Try to read from URL ?apptId=...
            const params = new URLSearchParams(window.location.search);
            const id = params.get('apptId');
            if (id) {
                this.appointmentId = id;
                this.load();
            } else {
                this.isLoading = false;
            }
        }
    }

    load() {
        getBayGreeting({ appointmentId: this.appointmentId })
            .then(d => { this.data = d; })
            .catch(() => { this.data = null; })
            .finally(() => { this.isLoading = false; });
    }

    get hasData() { return !!this.data && !!this.data.firstName; }
    get hasInsight() { return this.data && !!this.data.insightObservation; }
    get initial() {
        return this.data && this.data.firstName ? this.data.firstName[0].toUpperCase() : '?';
    }
}
