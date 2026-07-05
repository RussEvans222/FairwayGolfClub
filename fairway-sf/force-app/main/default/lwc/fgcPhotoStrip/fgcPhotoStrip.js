import { LightningElement } from 'lwc';
import IMAGES from '@salesforce/resourceUrl/fgcImages';

export default class FgcPhotoStrip extends LightningElement {
    get receptionImg() { return `${IMAGES}/reception.png`; }
    get simulatorImg() { return `${IMAGES}/simulator-bay.png`; }
    get loungeImg()    { return `${IMAGES}/bar-lounge.png`; }
}