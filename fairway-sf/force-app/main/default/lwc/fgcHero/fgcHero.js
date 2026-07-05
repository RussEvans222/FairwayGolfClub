import { LightningElement, track } from 'lwc';

export default class FgcHero extends LightningElement {
    @track email = '';
    @track submitted = false;

    handleEmailChange(e) {
        this.email = e.target.value;
    }

    handleSubmit(e) {
        e.preventDefault();
        fetch('https://formspree.io/f/russ@fairwaygolfclub.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: this.email, source: 'Experience Cloud' }),
        }).then(() => {
            this.submitted = true;
        });
    }
}