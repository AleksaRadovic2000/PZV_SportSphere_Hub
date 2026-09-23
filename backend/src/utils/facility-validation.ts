const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const validateFacility = (facility: any) => {
  if (
    !facility.name?.trim() ||
    !facility.city?.trim() ||
    !facility.address?.trim() ||
    !facility.description?.trim()
  ) {
    return "Naziv, grad, adresa i opis su obavezni";
  }

  if (!Number.isInteger(facility.allowedNoShows) || facility.allowedNoShows < 1) {
    return "Broj dozvoljenih nedolazaka mora biti pozitivan ceo broj";
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
    return "Koordinate lokacije nisu ispravne";
  }

  if (!Array.isArray(facility.workingHours) || facility.workingHours.length === 0) {
    return "Radno vreme je obavezno";
  }

  if (facility.workingHours.length > 7) {
    return "Radno vreme moze sadrzati najvise sedam dana";
  }

  const workingDays = facility.workingHours.map((item: any) => item.day);

  if (new Set(workingDays).size !== workingDays.length) {
    return "Isti radni dan moze biti unet samo jednom";
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
      return "Radno vreme nije ispravno";
    }
  }

  if (!Array.isArray(facility.resources) || facility.resources.length === 0) {
    return "Potreban je najmanje jedan teren ili hala";
  }

  const resourceNames = facility.resources.map((resource: any) =>
    resource.name?.trim().toLowerCase(),
  );

  if (resourceNames.some((name: string) => !name)) {
    return "Svaki teren ili hala mora imati naziv";
  }

  if (new Set(resourceNames).size !== resourceNames.length) {
    return "Nazivi terena i hala moraju biti jedinstveni u okviru objekta";
  }

  const hasOutdoorResource = facility.resources.some(
    (resource: any) => resource.type === "outdoor" && resource.capacity >= 4,
  );

  if (!hasOutdoorResource) {
    return "Potreban je najmanje jedan otvoreni teren kapaciteta najmanje cetiri osobe";
  }

  for (const resource of facility.resources) {
    if (!["outdoor", "indoor", "hall"].includes(resource.type)) {
      return "Tip terena ili hale nije ispravan";
    }

    if (!Number.isInteger(resource.capacity) || resource.capacity < 1) {
      return "Kapacitet terena ili hale mora biti pozitivan ceo broj";
    }

    if ((resource.equipmentDescription || "").length > 300) {
      return "Opis opreme moze imati najvise 300 karaktera";
    }

    if (!Array.isArray(resource.sportPrices) || resource.sportPrices.length === 0) {
      return "Svaki teren ili hala mora imati najmanje jedan sport i cenu";
    }

    const sports = resource.sportPrices.map((price: any) => price.sport?.trim());

    if (sports.some((sport: string) => !sport) || new Set(sports).size !== sports.length) {
      return "Sportovi jednog terena ili hale moraju biti izabrani i jedinstveni";
    }

    if (
      resource.sportPrices.some(
        (price: any) => typeof price.pricePerHour !== "number" || price.pricePerHour <= 0,
      )
    ) {
      return "Cena po satu mora biti pozitivna";
    }
  }

  if (!Array.isArray(facility.employeeUsernames) || facility.employeeUsernames.length === 0) {
    return "Potreban je najmanje jedan zaposleni";
  }

  if (facility.employeeUsernames.length > 2) {
    return "Objekat moze imati najvise dva zaposlena";
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
      startDate > endDate
    ) {
      return "Podaci o promociji nisu ispravni";
    }
  }

  return "";
};
