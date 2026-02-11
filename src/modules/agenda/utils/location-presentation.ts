import { parseUrl } from '@/modules/agenda/utils/url-parser.js';

const ARCHE_LOCATION_HOSTNAME = 'arche.univ-lorraine.fr';

export function getAgendaLocationPresentation(location: string): {
  locationUrl: URL | null;
  shouldDisplayLocation: boolean;
} {
  const locationUrl = parseUrl(location);
  const shouldDisplayLocation =
    locationUrl?.hostname !== ARCHE_LOCATION_HOSTNAME;

  return { locationUrl, shouldDisplayLocation };
}
