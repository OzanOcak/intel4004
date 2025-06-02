export class ROM4004 {
  constructor(size = 4096) {
    // 4004 has 4KB address space (12-bit)
    this.memory = new Uint8Array(size).fill(0x00); // Fill with NOPs (0x00)
  }

  // Load a program into ROM starting at a specific address
  loadProgram(program, startAddress = 0) {
    program.forEach((byte, i) => {
      this.memory[(startAddress + i) & 0xfff] = byte; // Mask to 12-bit
    });
  }

  // Read a byte from ROM
  read(address) {
    return this.memory[address & 0xfff]; // Mask to 12-bit
  }
}
