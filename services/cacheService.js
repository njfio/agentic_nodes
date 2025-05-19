/**
 * Simple in-memory cache service with TTL support
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();

    // Periodically clean expired cache items
    setInterval(() => this.cleanExpiredItems(), 60000); // Clean every minute
  }

  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null if not found
   */
  async get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const item = this.cache.get(key);
    const now = Date.now();

    // Check if the item is expired
    if (item.expiresAt && item.expiresAt < now) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set an item in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (0 for no expiration)
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds = 0) {
    const item = { value };

    // Set expiration time if TTL is provided
    if (ttlSeconds > 0) {
      item.expiresAt = Date.now() + (ttlSeconds * 1000);
      
      // Clear existing timer if it exists
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
      }
      
      // Set a timer to automatically remove the item
      const timer = setTimeout(() => this.delete(key), ttlSeconds * 1000);
      this.ttlTimers.set(key, timer);
    }

    this.cache.set(key, item);
  }

  /**
   * Delete an item from the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Whether the item was found and deleted
   */
  async delete(key) {
    // Clear the TTL timer if it exists
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
      this.ttlTimers.delete(key);
    }

    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   * @returns {Promise<void>}
   */
  async clear() {
    // Clear all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }
    
    this.ttlTimers.clear();
    this.cache.clear();
  }

  /**
   * Clean expired items from the cache
   * @private
   */
  cleanExpiredItems() {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.delete(key);
      }
    }
  }
}

module.exports = new CacheService();