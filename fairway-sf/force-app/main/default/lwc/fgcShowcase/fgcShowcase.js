import { LightningElement, api } from 'lwc';
import IMAGES from '@salesforce/resourceUrl/fgcImages';

export default class FgcShowcase extends LightningElement {
    @api eyebrow   = '';
    @api heading   = '';
    @api body      = '';
    @api imageFile = '';
    @api imageAlt  = '';
    @api reverse   = false;

    get imageSrc() { return `${IMAGES}/${this.imageFile}`; }
    get showcaseClass() { return `fgc-showcase${this.reverse ? ' fgc-showcase--reverse' : ''}`; }
}