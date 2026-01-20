import unitData from '../data/units.json';
import eventData from '../data/events.json';

export function getCardDetails(card: any): any {
    if (!card) return null;
    if (card.type === 'UNIT') {
        return (unitData as any)[card.unitId];
    } else if (card.type === 'EVENT') {
        return (eventData as any)[card.eventId];
    }
    return null;
}
