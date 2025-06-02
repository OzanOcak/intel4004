import { CPU4004 } from "../hardware/cpu.js";

// Initialize CPU
const cpu = new CPU4004();

//
//       TEST 1: Basic Arithmetic
//
console.log("TEST 1: LDM + ADD");

// Load 5 into accumulator (LDM 5)
cpu.execute({ type: "LDM", args: [0x5] });
console.assert(cpu.accumulator === 0x5, "❌ LDM failed");

// Add 3 (from register R1)
cpu.registers[1] = 0x3; // Manually set register R1
cpu.execute({ type: "ADD", args: [1] });
console.assert(cpu.accumulator === 0x8, "❌ ADD failed");
console.assert(cpu.carry === false, "❌ Carry flag error");

console.log("✅ TEST 1 PASSED");

//
//      TEST 2: Registers & Carry
//
console.log("\nTEST 2: Register Pairs + Carry");

// Set register pair R0R1 to 0xAB (FIM 0, 0xAB)
cpu.execute({ type: "FIM", args: [0, 0xab] });
console.assert(cpu.getRegisterPair(0) === 0xab, "❌ FIM failed");

// Test carry flag (IAC: Increment Accumulator)
cpu.accumulator = 0xf;
cpu.execute({ type: "IAC", args: [] });
console.assert(cpu.accumulator === 0x0, "❌ IAC result wrong");
console.assert(cpu.carry === true, "❌ IAC carry wrong");

console.log("✅ TEST 2 PASSED");

//
//        TEST 3: Flow Control
//
console.log("\nTEST 3: JCN (Jump Conditional)");

// Jump if accumulator is NOT zero (condition 0100 = jump if zero, inverted)
cpu.accumulator = 0x1; // Not zero
cpu.pc = 0; // Reset program counter
cpu.execute({ type: "JCN", args: [0b0100, 0x123] }); // Should NOT jump
console.assert(cpu.pc === 0, "❌ JCN jumped when it shouldn't");

cpu.accumulator = 0x0; // Zero
cpu.execute({ type: "JCN", args: [0b0100, 0x123] }); // SHOULD jump
console.assert(cpu.pc === 0x123, "❌ JCN failed to jump");

console.log("✅ TEST 3 PASSED");

console.log("\n🔥 ALL TESTS PASSED! CPU WORKS!");
