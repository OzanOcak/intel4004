import { CPU4004 } from "../hardware/cpu.js";
import { ROM4004 } from "../hardware/rom.js";

// Initialize CPU
const cpu = new CPU4004();

// Intialize ROM
const rom = new ROM4004();

// Attach ROM to CPU (override dummy reader)
cpu.memory.readROM = (addr) => rom.read(addr);

// Load test program
rom.loadProgram(
  [
    0xd5, // LDM 5
    0xb1, // XCH R1
    0xd3, // LDM 3
    0x81, // ADD R1
    0xb2, // XCH R2 (store result)
  ],
  0x200 // Load at address 0x200
);

// Reset CPU state
cpu.reset();
cpu.pc = 0x200;

// Step through the program
for (let i = 0; i < 5; i++) {
  cpu.step(); // Fetch
  cpu.step(); // Execute
}

// Verify results
console.assert(cpu.registers[1] === 0x5, "❌ R1 should be 5");
console.assert(
  cpu.accumulator === 0x0,
  "❌ Accumulator should be 0 after final XCH"
);
console.assert(cpu.registers[2] === 0x8, "❌ R2 should be 8 (5+3)");

console.log("✅ Addition test passed!");
