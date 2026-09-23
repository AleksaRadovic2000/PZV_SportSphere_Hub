import { Facility } from '../models/facility';
import { getSerbianLabel } from './serbian-label';

export function getFacilitySports(facility: Facility) {
  const sports = new Set<string>();

  facility.resources.forEach((resource) => {
    resource.sportPrices.forEach((price) => sports.add(price.sport));
  });

  return [...sports].sort().join(', ');
}

export function getFacilityResources(facility: Facility) {
  return facility.resources
    .map(
      (resource) =>
        `${resource.name} (${getSerbianLabel(resource.type)}, ${resource.capacity} mesta)`
    )
    .join(', ');
}
