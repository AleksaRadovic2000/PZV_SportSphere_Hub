export class SportPrice {
  sport = '';
  pricePerHour = 0;
}

export class FacilityResource {
  _id = '';
  name = '';
  type = 'outdoor';
  capacity = 4;
  equipmentDescription = '';
  sportPrices: SportPrice[] = [new SportPrice()];
}

export class WorkingHours {
  day = 1;
  from = '08:00';
  to = '22:00';
}

export class FacilityLocation {
  latitude = 0;
  longitude = 0;
}

export class Promotion {
  _id = '';
  name = '';
  sport = '';
  startDate = '';
  endDate = '';
  discountType = 'percentage';
  discountValue = 0;
}

export class Facility {
  _id = '';
  name = '';
  city = '';
  address = '';
  description = '';
  employeeUsernames: string[] = [];
  companyRegistrationNumber = '';
  status = 'pending';
  allowedNoShows = 1;
  images: string[] = [];
  location = new FacilityLocation();
  workingHours: WorkingHours[] = [];
  resources: FacilityResource[] = [new FacilityResource()];
  promotions: Promotion[] = [];
}

export class FacilityResponse {
  message = '';
  facility = new Facility();
}

export class TopFacility {
  _id = '';
  name = '';
  city = '';
  likes = 0;
}

export class PublicFacilityInfo {
  activeCount = 0;
  topFacilities: TopFacility[] = [];
}

export class CurrentPromotion extends Promotion {
  facilityId = '';
  facilityName = '';
}

export class FacilityDetailsResponse {
  facility = new Facility();
  likes = 0;
  dislikes = 0;
}
