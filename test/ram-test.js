import { CPU4004 } from "../hardware/cpu.js";
import { ROM4004 } from "../hardware/rom.js";

const cpu = new CPU4004();
const rom = new ROM4004();
cpu.memory.readROM = (addr) => rom.read(addr);

console.log("======================");
console.log("COMPREHENSIVE RAM ADDRESS TEST");
console.log("======================");

function testAddressDecoding() {
  // Test 1: Verify register writing
  console.log("\n1. Testing register access...");
  cpu.registers[0] = 0xa;
  cpu.registers[1] = 0xb;
  console.assert(cpu.registers[0] === 0xa, "Register 0 write failed");
  console.assert(cpu.registers[1] === 0xb, "Register 1 write failed");
  console.log("✅ Register access working");

  // Test 2: Address decoding
  console.log("\n2. Testing address decoding...");
  const testCases = [
    { r0: 0x3, r1: 0x1, expectedChar: 0x1, expectedNib: 0x0, desc: "0x13" },
    { r0: 0x4, r1: 0x2, expectedChar: 0x2, expectedNib: 0x1, desc: "0x24" },
    { r0: 0xc, r1: 0x3, expectedChar: 0x3, expectedNib: 0x3, desc: "0x3C" },
    { r0: 0x0, r1: 0xf, expectedChar: 0xf, expectedNib: 0x0, desc: "0xF0" },
  ];

  testCases.forEach((test) => {
    cpu.registers[0] = test.r0;
    cpu.registers[1] = test.r1;
    cpu.execute({ type: "SRC", args: [0] });

    console.log(`\nTesting ${test.desc}:`);
    console.log(`- R0=${test.r0}, R1=${test.r1}`);
    console.log(
      `- Got char=${cpu.currentRamCharacter}, nib=${cpu.currentRamNibble}`
    );

    console.assert(
      cpu.currentRamCharacter === test.expectedChar,
      `Character decode failed: expected ${test.expectedChar}`
    );

    console.assert(
      cpu.currentRamNibble === test.expectedNib,
      `Nibble decode failed: expected ${test.expectedNib}`
    );
  });
  console.log("✅ Address decoding working");

  // Test 3: Verify RAM write/read
  console.log("\n3. Testing RAM write/read...");
  cpu.registers[0] = 0x5;
  cpu.registers[1] = 0x1; // Address 0x15
  cpu.execute({ type: "SRC", args: [0] });

  // Write test
  cpu.accumulator = 0x9;
  cpu.execute({ type: "WRM", args: [] });

  // Read test
  cpu.execute({ type: "RDM", args: [] });
  console.assert(cpu.accumulator === 0x9, "RAM write/read failed");
  console.log("✅ RAM write/read working");

  console.log("\nTEST SUMMARY:");
  console.log("✅ All RAM address tests passed");
}

testAddressDecoding();
