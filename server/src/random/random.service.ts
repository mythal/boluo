import { Injectable } from '@nestjs/common';

const crypto = require('crypto');

const RNG_BUFFER_SIZE = 128;

@Injectable()
export class RandomService {
  private readonly rngBuffer: Int32Array;
  private rngOffset: number = 0;

  constructor() {
    this.rngBuffer = new Int32Array(RNG_BUFFER_SIZE);
    this.fillRngBuffer();
  }

  public genRandom(): number {
    if (this.rngOffset >= RNG_BUFFER_SIZE) {
      this.fillRngBuffer();
    }
    const rng = this.rngBuffer[this.rngOffset];
    this.rngOffset += 1;
    return rng;
  }

  private fillRngBuffer() {
    crypto.randomFillSync(this.rngBuffer);
    this.rngOffset = 0;
  }
}
