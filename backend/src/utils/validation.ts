/**
 * Validation utility functions
 */

/**
 * Checks if a string is a valid URL
 * @param value String to check
 * @returns True if valid URL
 */
export function isValidURL(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  
  /**
   * Checks if a value is a valid email address
   * @param value Value to check
   * @returns True if valid
   */
  export function isValidEmail(value: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  }
  
  /**
   * Checks if a value is a valid date
   * @param value Value to check
   * @returns True if valid
   */
  export function isValidDate(value: any): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    
    return false;
  }
  
  /**
   * Validates that an object has required properties
   * @param obj Object to validate
   * @param props Required property names
   * @returns True if all required properties exist and have values
   */
  export function hasRequiredProperties(obj: any, props: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    
    return props.every(prop => {
      const value = obj[prop];
      return value !== undefined && value !== null && value !== '';
    });
  }