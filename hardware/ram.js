export class RAM4004 {
  constructor() {
    // 8 chips × 16 characters × 4 nibbles
    this.memory = Array.from({ length: 8 }, () =>
      Array.from({ length: 16 }, () => new Uint8Array(4).fill(0))
    );
    this.currentChip = 0;
    // Remove address tracking from RAM - CPU will handle it
  }

  read(character, nibble) {
    return this.memory[this.currentChip][character][nibble] & 0xf;
  }

  write(character, nibble, value) {
    this.memory[this.currentChip][character][nibble] = value & 0xf;
  }

  setChipSelect(chip) {
    this.currentChip = chip & 0x7;
  }
}
