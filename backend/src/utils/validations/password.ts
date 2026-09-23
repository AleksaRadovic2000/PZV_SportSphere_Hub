export const passwordPattern = /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/;

export const isPasswordValid = (password: string) => passwordPattern.test(password);
