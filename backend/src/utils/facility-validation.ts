const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const validateFacility = (facility: any) => {
  if (
    !facility.name?.trim() ||
    !facility.city?.trim() ||
    !facility.address?.trim() ||
    !facility.description?.trim()
  ) {
    return "Name, city, address and description are required";
  }

  if (!Number.isInteger(facility.allowedNoShows) || facility.allowedNoShows < 0) {
    return "Allowed no-shows must be a non-negative whole number";
  }

  const latitude = facility.location?.latitude;
  const longitude = facility.location?.longitude;

  if (
    typeof latitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    longitude < -180 ||
    longitude > 180
  ) {
    return "Location coordinates are not valid";
  }

  if (!Array.isArray(facility.workingHours) || facility.workingHours.length === 0) {
    return "Working hours are required";
  }

  if (facility.workingHours.length > 7) {
    return "Working hours can contain at most seven days";
  }

  const workingDays = facility.workingHours.map((item: any) => item.day);

  if (new Set(workingDays).size !== workingDays.length) {
    return "A working day can be entered only once";
  }

  for (const item of facility.workingHours) {
    if (
      !Number.isInteger(item.day) ||
      item.day < 1 ||
      item.day > 7 ||
      !timePattern.test(item.from) ||
      !timePattern.test(item.to) ||
      item.from >= item.to
    ) {
      return "Working hours are not valid";
    }
  }

  if (!Array.isArray(facility.resources) || facility.resources.length === 0) {
    return "At least one resource is required";
  }

  const resourceNames = facility.resources.map((resource: any) =>
    resource.name?.trim().toLowerCase(),
  );

  if (resourceNames.some((name: string) => !name)) {
    return "Every resource must have a name";
  }

  if (new Set(resourceNames).size !== resourceNames.length) {
    return "Resource names must be unique within a facility";
  }

  const hasOutdoorResource = facility.resources.some(
    (resource: any) => resource.type === "outdoor" && resource.capacity >= 4,
  );

  if (!hasOutdoorResource) {
    return "At least one outdoor resource with capacity of four is required";
  }

  for (const resource of facility.resources) {
    if (!["outdoor", "indoor", "hall"].includes(resource.type)) {
      return "Resource type is not valid";
    }

    if (!Number.isInteger(resource.capacity) || resource.capacity < 1) {
      return "Resource capacity must be a positive whole number";
    }

    if ((resource.equipmentDescription || "").length > 300) {
      return "Equipment description can contain at most 300 characters";
    }

    if (!Array.isArray(resource.sportPrices) || resource.sportPrices.length === 0) {
      return "Every resource must have at least one sport and price";
    }

    const sports = resource.sportPrices.map((price: any) => price.sport?.trim());

    if (sports.some((sport: string) => !sport) || new Set(sports).size !== sports.length) {
      return "Sports within one resource must be selected and unique";
    }

    if (
      resource.sportPrices.some(
        (price: any) => typeof price.pricePerHour !== "number" || price.pricePerHour <= 0,
      )
    ) {
      return "Price per hour must be positive";
    }
  }

  if (!Array.isArray(facility.employeeUsernames) || facility.employeeUsernames.length === 0) {
    return "At least one employee is required";
  }

  if (facility.employeeUsernames.length > 2) {
    return "A facility can have at most two employees";
  }

  if (!Array.isArray(facility.promotions)) {
    facility.promotions = [];
  }

  for (const promotion of facility.promotions) {
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (
      !promotion.name?.trim() ||
      !promotion.sport?.trim() ||
      !["percentage", "fixed"].includes(promotion.discountType) ||
      typeof promotion.discountValue !== "number" ||
      promotion.discountValue <= 0 ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      startDate >= endDate
    ) {
      return "Promotion data is not valid";
    }
  }

  return "";
};
