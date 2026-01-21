import units from '../data/units.json';
import events from '../data/events.json';
import { Card, UnitDef, EventDef } from '../Game/types';

export const getCardDetails = (card: Card): UnitDef | EventDef | null => {
    if (!card) return null;
    if (card.type === 'UNIT') {
        const asset = (units as any).assets?.find((a: any) => a.id === card.defId);
        return asset || null;
    } else if (card.type === 'EVENT') {
        const event = (events as any).events?.find((e: any) => e.id === card.defId);
        return event || null;
    }
    return null;
}
