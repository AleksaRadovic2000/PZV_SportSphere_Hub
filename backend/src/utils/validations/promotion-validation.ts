export const getPromotionEndDate = (value: string | Date) => {
  const endDate = new Date(value);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

export const getPromotionStartDate = (value: string | Date) => {
  const startDate = new Date(value);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
};

export const validatePromotion = (promotion: any) => {
  if (!promotion || !promotion.name?.trim() || !promotion.sport?.trim()) {
    return "Naziv promocije i sport su obavezni";
  }

  const startDate = getPromotionStartDate(promotion.startDate);
  const endDate = getPromotionEndDate(promotion.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return "Period promocije nije ispravan";
  }

  if (!["percentage", "fixed"].includes(promotion.discountType)) {
    return "Tip popusta promocije nije ispravan";
  }

  if (typeof promotion.discountValue !== "number" || promotion.discountValue <= 0) {
    return "Vrednost popusta promocije mora biti pozitivna";
  }

  if (promotion.discountType === "percentage" && promotion.discountValue > 100) {
    return "Procentualni popust ne moze biti veci od 100";
  }

  return "";
};
