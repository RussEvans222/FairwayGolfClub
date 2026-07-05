import { LightningElement } from 'lwc';
import IMAGES from '@salesforce/resourceUrl/fgcImages';

export default class FgcGallery extends LightningElement {
    get images() {
        const base = IMAGES;
        return [
            { id: 1, src: `${base}/bays-social.png`,  alt: 'Bays and social area' },
            { id: 2, src: `${base}/coaching.png`,      alt: 'AI coaching in action' },
            { id: 3, src: `${base}/bar.png`,           alt: 'Bar experience' },
            { id: 4, src: `${base}/lounge-detail.png`, alt: 'Lounge details' },
        ];
    }
}