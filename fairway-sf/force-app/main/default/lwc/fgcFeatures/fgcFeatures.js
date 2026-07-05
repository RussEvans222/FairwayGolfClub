import { LightningElement } from 'lwc';

export default class FgcFeatures extends LightningElement {
    features = [
        { id: 1, icon: '⛳', title: 'Premium Simulators',       description: 'Full-swing TrackMan bays with 200+ world-famous courses. Rip it at Pebble, Augusta, or St. Andrews.' },
        { id: 2, icon: '🤖', title: 'AI Coaching Engine',       description: 'Your personal AI coach tracks every swing, compares your data over time, and pushes personalized drills.' },
        { id: 3, icon: '🍸', title: 'Craft Bar & Kitchen',      description: 'Craft cocktails, local draft, and a full food menu. The post-round debrief has never been this good.' },
        { id: 4, icon: '📱', title: 'Mobile-First Booking',     description: 'Reserve a bay, check your progress, and invite friends — all from the app before you leave the office.' },
        { id: 5, icon: '👥', title: 'Private Events & Leagues', description: 'Corporate outings, bachelor parties, or a weekly league. We handle the setup; you bring the competition.' },
        { id: 6, icon: '🏆', title: 'Member Progression',       description: 'Track your handicap improvement, earn badges, and unlock exclusive member perks as you level up.' },
    ];
}