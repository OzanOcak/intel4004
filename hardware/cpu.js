export class CPU4004 {
  constructor() {
    // Registers: Creates 16 4-bit registers (using 8-bit storage) initialized to 0.
    // The 4004 has registers organized as 8 pairs (R0-R1, R2-R3, etc.) for 8-bit operations.
    this.registers = new Uint8Array(16).fill(0);

    // Accumulator: The primary 4-bit working register for arithmetic and logic operations.
    this.accumulator = 0;

    // Carry Flag: A 1-bit flag used for arithmetic operations (addition/subtraction overflow).
    this.carry = false;

    // Program Counter (PC): 12-bit counter that keeps track of the current instruction address in ROM
    this.pc = 0;

    // Stack: The 4004 has a 3-level hardware stack (12-bit width) for subroutine calls. The stack pointer tracks the current level.
    this.stack = new Uint16Array(3).fill(0);
    this.stackPointer = 0;

    // Memory interface
    this.memory = {
      readROM: () => 0, // readROM: Reads from ROM (returns 0/NOP by default)
      setRamAddress: () => {},
      readRAM: () => 0,
      writeRAM: () => {},
      currentRamRegister: 0,
      currentRamNibble: 0,
    };
    // this.memory = new Memory4004();

    // I/O ports
    this.io = {
      readInput: () => 0, // Always return 0 for input pins
      writeOutput: () => {}, // Ignore all outputs
      readStatus: () => 0, // Status registers zeroed
      writeStatus: () => {},
      testInputPin: () => false, // No input pins active
    };
    //this.io = new IO4004();

    // Instruction cycle state
    this.currentInstruction = null;
    this.cycle = 0;

    // Performance tracking
    this.instructionsExecuted = 0;
    this.cyclesExecuted = 0;
  }

  // Reset the CPU to initial state
  reset() {
    this.registers.fill(0);
    this.accumulator = 0;
    this.carry = false;
    this.pc = 0;
    this.stack.fill(0);
    this.stackPointer = 0;
    this.currentInstruction = null;
    this.cycle = 0;
    this.instructionsExecuted = 0;
    this.cyclesExecuted = 0;
  }

  // Fetch the next instruction
  fetch() {
    const instructionByte = this.memory.readROM(this.pc);
    this.pc = (this.pc + 1) & 0xfff; // 12-bit wrap-around
    return instructionByte;
  }

  // Execute a single instruction
  step() {
    if (this.cycle === 0) {
      // Fetch phase
      const opcode = this.fetch();
      this.currentInstruction = this.decode(opcode);
      this.cycle++;
      this.cyclesExecuted++;
      return; // Wait for next cycle to execute
    }

    // Execute phase
    this.execute(this.currentInstruction);
    this.cycle = 0;
    this.instructionsExecuted++;
    this.cyclesExecuted++;
  }

  // Decode an instruction
  decode(opcode) {
    // First nibble determines instruction class
    const firstNibble = opcode >> 4;

    // Second nibble provides additional info
    const secondNibble = opcode & 0xf;

    let instruction = {
      opcode: opcode,
      type: "UNKNOWN", // Default to unknown
      args: [],
    };

    switch (firstNibble) {
      // 0x0: NOP and single-byte instructions
      case 0x0:
        if (opcode === 0x00) {
          instruction.type = "NOP";
        } else if ((opcode & 0xf0) === 0xe0) {
          // Extended instruction set (0xE0-0xEF)
          switch (opcode) {
            case 0xe0:
              instruction.type = "WRM";
              break;
            case 0xe1:
              instruction.type = "WMP";
              break;
            case 0xe2:
              instruction.type = "WRR";
              break;
            case 0xe4:
              instruction.type = "WR0";
              break;
            case 0xe5:
              instruction.type = "WR1";
              break;
            case 0xe6:
              instruction.type = "WR2";
              break;
            case 0xe7:
              instruction.type = "WR3";
              break;
            case 0xe8:
              instruction.type = "SBM";
              break;
            case 0xe9:
              instruction.type = "RDM";
              break;
            case 0xea:
              instruction.type = "RDR";
              break;
            case 0xeb:
              instruction.type = "ADM";
              break;
            case 0xec:
              instruction.type = "RD0";
              break;
            case 0xed:
              instruction.type = "RD1";
              break;
            case 0xee:
              instruction.type = "RD2";
              break;
            case 0xef:
              instruction.type = "RD3";
              break;
          }
        } else if ((opcode & 0xf0) === 0xf0) {
          // Extended instruction set (0xF0-0xFF)
          switch (opcode) {
            case 0xf0:
              instruction.type = "CLB";
              break;
            case 0xf1:
              instruction.type = "CLC";
              break;
            case 0xf2:
              instruction.type = "IAC";
              break;
            case 0xf3:
              instruction.type = "CMC";
              break;
            case 0xf4:
              instruction.type = "CMA";
              break;
            case 0xf5:
              instruction.type = "RAL";
              break;
            case 0xf6:
              instruction.type = "RAR";
              break;
            case 0xf7:
              instruction.type = "TCC";
              break;
            case 0xf8:
              instruction.type = "DAC";
              break;
            case 0xf9:
              instruction.type = "TCS";
              break;
            case 0xfa:
              instruction.type = "STC";
              break;
            case 0xfb:
              instruction.type = "DAA";
              break;
            case 0xfc:
              instruction.type = "KBP";
              break;
            case 0xfd:
              instruction.type = "DCL";
              break;
          }
        }
        break;

      // 0x1: Jump Conditional
      case 0x1:
        instruction.type = "JCN";
        instruction.args.push(secondNibble); // Condition
        instruction.args.push(this.fetch()); // Address
        break;

      // 0x2: FIM/SRC
      case 0x2:
        if (opcode & 0x01) {
          instruction.type = "SRC";
          instruction.args.push(secondNibble >> 1); // Register pair (0-7)
        } else {
          instruction.type = "FIM";
          instruction.args.push(secondNibble >> 1); // Register pair (0-7)
          instruction.args.push(this.fetch()); // Data byte
        }
        break;

      // 0x3: FIN/JIN
      case 0x3:
        if (opcode & 0x01) {
          instruction.type = "JIN";
          instruction.args.push(secondNibble >> 1); // Register pair (0-7)
        } else {
          instruction.type = "FIN";
          instruction.args.push(secondNibble >> 1); // Register pair (0-7)
        }
        break;

      // 0x4: JUN (Jump Unconditional)
      case 0x4:
        instruction.type = "JUN";
        instruction.args.push(secondNibble); // High address nibble
        instruction.args.push(this.fetch()); // Low address byte
        break;

      // 0x5: JMS (Jump to Subroutine)
      case 0x5:
        instruction.type = "JMS";
        instruction.args.push(secondNibble); // High address nibble
        instruction.args.push(this.fetch()); // Low address byte
        break;

      // 0x6: INC (Increment Register)
      case 0x6:
        instruction.type = "INC";
        instruction.args.push(secondNibble); // Register (0-15)
        break;

      // 0x7: ISZ (Increment and Skip if Zero)
      case 0x7:
        instruction.type = "ISZ";
        instruction.args.push(secondNibble); // Register (0-15)
        instruction.args.push(this.fetch()); // Address
        break;

      // 0x8: ADD
      case 0x8:
        instruction.type = "ADD";
        instruction.args.push(secondNibble); // Register (0-15)
        break;

      // 0x9: SUB
      case 0x9:
        instruction.type = "SUB";
        instruction.args.push(secondNibble); // Register (0-15)
        break;

      // 0xA: LD (Load)
      case 0xa:
        instruction.type = "LD";
        instruction.args.push(secondNibble); // Register (0-15)
        break;

      // 0xB: XCH (Exchange)
      case 0xb:
        instruction.type = "XCH";
        instruction.args.push(secondNibble); // Register (0-15)
        break;

      // 0xC: BBL (Branch Back and Load)
      case 0xc:
        instruction.type = "BBL";
        instruction.args.push(secondNibble); // Data (0-15)
        break;

      // 0xD: LDM (Load Immediate)
      case 0xd:
        instruction.type = "LDM";
        instruction.args.push(secondNibble); // Data (0-15)
        break;

      default:
        console.error(
          `Unknown opcode: 0x${opcode.toString(16).padStart(2, "0")}`
        );
    }

    return instruction;
  }

  execute(instruction) {
    switch (instruction.type) {
      // 1. No Operation
      case "NOP":
        // Do nothing
        break;

      // 2. Jump Conditional
      case "JCN":
        const condition = instruction.args[0];
        const address = instruction.args[1];
        let shouldJump = false;

        // Evaluate condition
        if (condition & 0b1000 && !this.carry) shouldJump = true;
        if (condition & 0b0100 && this.accumulator === 0) shouldJump = true;
        if (condition & 0b0010 && this.io.testInputPin()) shouldJump = true;
        if (condition & 0b0001) shouldJump = !shouldJump;

        if (shouldJump) {
          this.pc = address;
        }
        break;

      // 3. Fetch Immediate
      case "FIM":
        const regPairFIM = instruction.args[0];
        const dataFIM = instruction.args[1];
        this.setRegisterPair(regPairFIM, dataFIM);
        break;

      // 4. Send Register Control
      case "SRC":
        const regPairSRC = instruction.args[0];
        const addressSRC = this.getRegisterPair(regPairSRC);
        // In a real 4004, this would set up the RAM address
        this.memory.setRamAddress(addressSRC);
        break;

      // 5. Fetch Indirect
      case "FIN":
        const regPairFIN = instruction.args[0];
        const addressFIN = this.getRegisterPair(0); // Always uses R0R1
        const dataFIN = this.memory.readROM(addressFIN);
        this.setRegisterPair(regPairFIN, dataFIN);
        break;

      // 6. Jump Indirect
      case "JIN":
        const regPairJIN = instruction.args[0];
        const addressJIN = this.getRegisterPair(regPairJIN);
        this.pc = addressJIN;
        break;

      // 7. Jump Unconditional
      case "JUN":
        const addressJUN = (instruction.args[0] << 8) | instruction.args[1];
        this.pc = addressJUN;
        break;

      // 8. Jump to Subroutine
      case "JMS":
        const addressJMS = (instruction.args[0] << 8) | instruction.args[1];
        // Push current PC to stack
        this.stack[this.stackPointer] = this.pc;
        this.stackPointer = (this.stackPointer + 1) % 3;
        this.pc = addressJMS;
        break;

      // 9. Increment
      case "INC":
        const regINC = instruction.args[0];
        this.registers[regINC] = (this.registers[regINC] + 1) & 0xf;
        break;

      // 10. Increment and Skip if Zero
      case "ISZ":
        const regISZ = instruction.args[0];
        const addressISZ = instruction.args[1];
        this.registers[regISZ] = (this.registers[regISZ] + 1) & 0xf;
        if (this.registers[regISZ] === 0) {
          this.pc = addressISZ;
        }
        break;

      // 11. Add
      case "ADD":
        const regADD = instruction.args[0];
        const sum = this.accumulator + this.registers[regADD];
        this.accumulator = sum & 0xf;
        this.carry = sum > 0xf;
        break;

      // 12. Subtract
      case "SUB":
        const regSUB = instruction.args[0];
        const diff =
          this.accumulator - this.registers[regSUB] - (this.carry ? 0 : 1);
        this.accumulator = diff & 0xf;
        this.carry = diff >= 0;
        break;

      // 13. Load
      case "LD":
        const regLD = instruction.args[0];
        this.accumulator = this.registers[regLD];
        break;

      // 14. Exchange
      case "XCH":
        const regXCH = instruction.args[0];
        const temp = this.accumulator;
        this.accumulator = this.registers[regXCH];
        this.registers[regXCH] = temp;
        break;

      // 15. Branch Back and Load
      case "BBL":
        const dataBBL = instruction.args[0];
        // Pop return address from stack
        this.stackPointer = (this.stackPointer - 1 + 3) % 3;
        this.pc = this.stack[this.stackPointer];
        this.accumulator = dataBBL;
        break;

      // 16. Load Immediate
      case "LDM":
        const dataLDM = instruction.args[0];
        this.accumulator = dataLDM;
        break;

      // 17. Write Main Memory
      case "WRM":
        this.memory.writeRAM(
          this.memory.currentRamRegister,
          this.memory.currentRamNibble,
          this.accumulator
        );
        break;

      // 18. Write RAM Port
      case "WMP":
        this.io.writeOutput(0, this.accumulator); // Port 0
        break;

      // 19. Write ROM Port
      case "WRR":
        // Not typically emulated as it's for custom ROM I/O
        break;

      // 20-23. Write Status Char 0-3
      case "WR0":
      case "WR1":
      case "WR2":
      case "WR3":
        const statusPort = parseInt(instruction.type[2]);
        this.io.writeStatus(statusPort, this.accumulator);
        break;

      // 24. Subtract Main Memory
      case "SBM":
        const ramValueSBM = this.memory.readRAM(
          this.memory.currentRamRegister,
          this.memory.currentRamNibble
        );
        const diffSBM = this.accumulator - ramValueSBM - (this.carry ? 0 : 1);
        this.accumulator = diffSBM & 0xf;
        this.carry = diffSBM >= 0;
        break;

      // 25. Read Main Memory
      case "RDM":
        this.accumulator = this.memory.readRAM(
          this.memory.currentRamRegister,
          this.memory.currentRamNibble
        );
        break;

      // 26. Read ROM Port
      case "RDR":
        // Not typically emulated as it's for custom ROM I/O
        break;

      // 27. Add Main Memory
      case "ADM":
        const ramValueADM = this.memory.readRAM(
          this.memory.currentRamRegister,
          this.memory.currentRamNibble
        );
        const sumADM = this.accumulator + ramValueADM;
        this.accumulator = sumADM & 0xf;
        this.carry = sumADM > 0xf;
        break;

      // 28-31. Read Status Char 0-3
      case "RD0":
      case "RD1":
      case "RD2":
      case "RD3":
        const statusPortRD = parseInt(instruction.type[2]);
        this.accumulator = this.io.readStatus(statusPortRD);
        break;

      // 32. Clear Both
      case "CLB":
        this.accumulator = 0;
        this.carry = false;
        break;

      // 33. Clear Carry
      case "CLC":
        this.carry = false;
        break;

      // 34. Increment Accumulator
      case "IAC":
        this.accumulator = (this.accumulator + 1) & 0xf;
        this.carry = this.accumulator === 0;
        break;

      // 35. Complement Carry
      case "CMC":
        this.carry = !this.carry;
        break;

      // 36. Complement
      case "CMA":
        this.accumulator = ~this.accumulator & 0xf;
        break;

      // 37. Rotate Left
      case "RAL":
        const newCarryRAL = (this.accumulator & 0x8) !== 0;
        this.accumulator =
          ((this.accumulator << 1) | (this.carry ? 1 : 0)) & 0xf;
        this.carry = newCarryRAL;
        break;

      // 38. Rotate Right
      case "RAR":
        const newCarryRAR = (this.accumulator & 0x1) !== 0;
        this.accumulator = (this.accumulator >> 1) | (this.carry ? 0x8 : 0);
        this.carry = newCarryRAR;
        break;

      // 39. Transfer Carry and Clear
      case "TCC":
        this.accumulator = this.carry ? 1 : 0;
        this.carry = false;
        break;

      // 40. Decrement Accumulator
      case "DAC":
        this.accumulator = (this.accumulator - 1) & 0xf;
        this.carry = this.accumulator !== 0xf;
        break;

      // 41. Transfer Carry Subtract
      case "TCS":
        this.accumulator = this.carry ? 10 : 9;
        this.carry = false;
        break;

      // 42. Set Carry
      case "STC":
        this.carry = true;
        break;

      // 43. Decimal Adjust Accumulator
      case "DAA":
        if (this.accumulator > 9 || this.carry) {
          this.accumulator = (this.accumulator + 6) & 0xf;
          this.carry = true;
        }
        break;

      // 44. Keyboard Process
      case "KBP":
        // Simple implementation - converts 1-of-4 to binary
        switch (this.accumulator) {
          case 0b0001:
            this.accumulator = 0;
            break;
          case 0b0010:
            this.accumulator = 1;
            break;
          case 0b0100:
            this.accumulator = 2;
            break;
          case 0b1000:
            this.accumulator = 3;
            break;
          default:
            this.accumulator = 0xf; // Error code
        }
        break;

      // 45. Designate Command Line
      case "DCL":
        this.memory.setRamChipSelect(this.accumulator & 0x3);
        break;

      default:
        console.error(`Unknown instruction: ${instruction.type}`);
    }
  }

  // Helper methods for instruction implementation

  /** ----------- 1. Register Access Helpers ------------- **/

  // Get a single 4-bit register

  getRegister(index) {
    return this.registers[index] & 0xf; // Mask to 4 bits
  }

  // Set a single 4-bit register

  setRegister(index, value) {
    this.registers[index] = value & 0xf;
  }

  // Get a register pair (8 bits) - Used for 8-bit operations

  getRegisterPair(index) {
    const low = this.registers[index * 2] & 0xf;
    const high = this.registers[index * 2 + 1] & 0xf;
    return (high << 4) | low;
  }

  // Set a register pair (8 bits)

  setRegisterPair(index, value) {
    this.registers[index * 2] = value & 0xf; // Low nibble
    this.registers[index * 2 + 1] = (value >> 4) & 0xf; // High nibble
  }

  /** ----------- 2. Arithmetic Helpers (4-bit with Carry) ------------- **/

  // Add with carry (returns { result, carry })

  add4Bit(a, b) {
    const result = a + b + (this.carry ? 1 : 0);
    return {
      result: result & 0xf,
      carry: result > 0xf,
    };
  }

  // Subtract with borrow (returns { result, carry })

  sub4Bit(a, b) {
    const result = a - b - (this.carry ? 1 : 0);
    return {
      result: result & 0xf,
      carry: result >= 0, // Carry is INVERTED on subtraction (0 = borrow)
    };
  }

  // BCD (Binary Coded Decimal) adjust for addition

  bcdAdjust() {
    if (this.accumulator > 9 || this.carry) {
      this.accumulator = (this.accumulator + 6) & 0xf;
      this.carry = true;
    }
  }

  /** ----------- 3. Stack Operations ------------- **/

  // Push 12-bit address to stack

  pushStack(address) {
    if (this.stackPointer < 3) {
      this.stack[this.stackPointer++] = address & 0xfff;
    } else {
      console.error("Stack overflow!");
    }
  }

  // Pop 12-bit address from stack

  popStack() {
    if (this.stackPointer > 0) {
      return this.stack[--this.stackPointer];
    } else {
      console.error("Stack underflow!");
      return 0;
    }
  }

  /** ----------- 4. Memory/IO Helpers ------------- **/

  // Read 4 bits from memory (ROM/RAM)

  readMemory(address) {
    return this.memory.read(address) & 0xf;
  }

  // Write 4 bits to memory (RAM)

  writeMemory(address, value) {
    this.memory.write(address, value & 0xf);
  }

  // Read 4-bit input port

  readInput(port) {
    return this.io.readInput(port & 0xf);
  }

  // Write 4-bit output port

  writeOutput(port, value) {
    this.io.writeOutput(port & 0xf, value & 0xf);
  }

  /** ----------- 5. Flag/Utility Helpers ------------- **/

  // Test accumulator for zero
  isAccZero() {
    return this.accumulator === 0;
  }

  // Test specific input pin (for JCN instruction)
  testInputPin(pin = 0) {
    return (this.io.readInput(0) & (1 << pin)) !== 0;
  }

  // Rotate accumulator left through carry
  rotateLeft() {
    const newCarry = (this.accumulator & 0x8) !== 0;
    this.accumulator = ((this.accumulator << 1) | (this.carry ? 1 : 0)) & 0xf;
    this.carry = newCarry;
  }

  // Rotate accumulator right through carry
  rotateRight() {
    const newCarry = this.accumulator & 0x1;
    this.accumulator = ((this.accumulator >> 1) | (this.carry ? 0x8 : 0)) & 0xf;
    this.carry = newCarry;
  }

  /** ----------- 6. Instruction Fetch Helpers ------------- **/

  // Fetch next 4-bit nibble (for immediate values)
  fetchNibble() {
    return this.fetch() & 0xf;
  }

  // Fetch next 8-bit immediate value (for FIM/SRC instructions)
  fetchByte() {
    const low = this.fetch() & 0xf;
    const high = this.fetch() & 0xf;
    return (high << 4) | low;
  }
}
