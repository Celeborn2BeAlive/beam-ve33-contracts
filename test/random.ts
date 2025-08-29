export class Mulberry32 {
  private state: number;

  /**
   * Creates a new Mulberry32 PRNG instance
   * @param seed The seed value (will be converted to 32-bit unsigned integer)
   */
  constructor(seed: number | string) {
    // Convert string seeds to numbers using a simple hash
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      this.state = hash;
    } else {
      // Convert number seed to 32-bit unsigned integer
      this.state = seed | 0;
    }
  }

  /**
   * Generates the next pseudorandom number in the sequence
   * @returns A pseudorandom number in the range [0, 1)
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudorandom integer within a specified range
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns A pseudorandom integer in the range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a pseudorandom boolean
   * @returns true or false with approximately 50% probability
   */
  nextBoolean(): boolean {
    return this.next() >= 0.5;
  }

  /**
   * Generates a pseudorandom float within a specified range
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns A pseudorandom float in the range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}
