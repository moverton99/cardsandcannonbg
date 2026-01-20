import units from '../data/units.json';
import events from '../data/events.json';
import { Card } from '../Game/types';

export const getCardDetails = (card: Card): any => {
    if (!card) return null;
    if (card.type === 'UNIT') {
        return (units as any)[card.unitId];
    } else if (card.type === 'EVENT') {
        return (events as any)[card.eventId];
    }
    return null;
}
