export interface PasswordValidation {
  hasUppercase: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password);
  return { hasUppercase, hasSpecial, isValid: hasUppercase && hasSpecial };
}
