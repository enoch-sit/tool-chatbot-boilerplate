// src/utils/storage.ts

/**
 * A generic storage interface to allow for different storage implementations
 * (e.g., localStorage, sessionStorage).
 */
interface StorageAPI {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * A wrapper class that provides a type-safe and error-handled interface
 * for browser storage APIs like localStorage and sessionStorage.
 */
class StorageService {
  private storage: StorageAPI;

  constructor(storage: StorageAPI) {
    this.storage = storage;
  }

  /**
   * Retrieves and parses a value from storage.
   * @param key The key of the item to retrieve.
   * @returns The parsed value, or null if the key doesn't exist or an error occurs.
   */
  get<T>(key: string): T | null {
    try {
      const value = this.storage.getItem(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting item "${key}" from storage:`, error);
      return null;
    }
  }

  /**
   * Stringifies and sets a value in storage.
   * @param key The key of the item to set.
   * @param value The value to store.
   */
  set<T>(key: string, value: T): void {
    try {
      const stringifiedValue = JSON.stringify(value);
      this.storage.setItem(key, stringifiedValue);
    } catch (error) {
      console.error(`Error setting item "${key}" in storage:`, error);
    }
  }

  /**
   * Removes an item from storage.
   * @param key The key of the item to remove.
   */
  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item "${key}" from storage:`, error);
    }
  }
}

// Export pre-configured instances for both localStorage and sessionStorage.
export const localStorageService = new StorageService(window.localStorage);
export const sessionStorageService = new StorageService(window.sessionStorage);

export default localStorageService;