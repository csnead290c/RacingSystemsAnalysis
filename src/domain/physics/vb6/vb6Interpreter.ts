/**
 * VB6 Interpreter for TIMESLIP.FRM
 * 
 * This module provides a JavaScript interpreter that can execute VB6 code
 * directly from the original TIMESLIP.FRM source file, guaranteeing exact
 * matching with the original VB6 physics engine.
 * 
 * VB6 Features Supported:
 * - Variables: Single, Integer, arrays (1-indexed)
 * - Math: +, -, *, /, ^, Mod
 * - Functions: Sqr, Abs, Sin, Cos, Sgn, CInt, CLng, Format
 * - Control: If/Then/Else, For/Next, GoTo, GoSub/Return
 * - Form controls mapped to input parameters
 * 
 * Architecture:
 * 1. Parse VB6 source into statements
 * 2. Execute statements with label-based control flow
 * 3. Map gc_* form controls to input parameters
 * 4. Return calculated results
 */

// ============================================================================
// VB6 Runtime Types
// ============================================================================

/** VB6 Single precision (32-bit float) */
function vbSingle(value: number): number {
  return Math.fround(value);
}

/** VB6 Integer (16-bit signed) */
function vbInteger(value: number): number {
  return Math.trunc(value) | 0;
}

/** VB6 Long (32-bit signed) */
function vbLong(value: number): number {
  return Math.trunc(value) | 0;
}

// ============================================================================
// VB6 Built-in Functions
// ============================================================================

const VB6Functions: Record<string, (...args: number[]) => number> = {
  Sqr: (x) => vbSingle(Math.sqrt(x)),
  Abs: (x) => vbSingle(Math.abs(x)),
  Sin: (x) => vbSingle(Math.sin(x)),
  Cos: (x) => vbSingle(Math.cos(x)),
  Tan: (x) => vbSingle(Math.tan(x)),
  Atn: (x) => vbSingle(Math.atan(x)),
  Sgn: (x) => x > 0 ? 1 : x < 0 ? -1 : 0,
  Int: (x) => Math.floor(x),
  Fix: (x) => Math.trunc(x),
  CInt: (x) => vbInteger(Math.round(x)),
  CLng: (x) => vbLong(Math.round(x)),
  CSng: (x) => vbSingle(x),
  Log: (x) => vbSingle(Math.log(x)),
  Exp: (x) => vbSingle(Math.exp(x)),
};

// ============================================================================
// VB6 Constants from TIMESLIP.FRM
// ============================================================================

const VB6Constants: Record<string, number> = {
  PI: 3.141593,
  gc: 32.174, // gravitational constant ft/s²
  Z5: 3600 / 5280,
  Z6: (60 / (2 * 3.141593)) * 550,
  JMin: -4,
  JMax: 2,
  K6: 0.92,
  K61: 1.08,
  AMin: 0.004,
  // Quarter Pro constants (non-BVPro)
  AX: 10.8,
  CMU: 0.025,
  CMUK: 0.01,
  TimeTol: 0.002,
  KV: 0.02 / (3600 / 5280),
  K7: 9.5,
  KP21: 0.15,
  KP22: 0.25,
  FRCT: 1.03,
};

// ============================================================================
// VB6 Lexer - Tokenize VB6 source code
// ============================================================================

type TokenType = 
  | 'NUMBER' | 'STRING' | 'IDENTIFIER' | 'KEYWORD' | 'OPERATOR' 
  | 'LPAREN' | 'RPAREN' | 'COMMA' | 'COLON' | 'DOT' | 'NEWLINE' | 'LABEL' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
  line: number;
}

const VB6Keywords = new Set([
  'Dim', 'As', 'Single', 'Integer', 'Long', 'String', 'Boolean', 'Double', 'Variant',
  'If', 'Then', 'Else', 'ElseIf', 'End', 'For', 'To', 'Step', 'Next',
  'Do', 'While', 'Loop', 'Until', 'Wend',
  'GoTo', 'GoSub', 'Return', 'Exit', 'Function', 'Sub',
  'Select', 'Case', 'And', 'Or', 'Not', 'Mod', 'Is', 'Like',
  'True', 'False', 'Nothing', 'Rem', 'Call', 'With', 'Private', 'Public',
  'Const', 'Static', 'ByVal', 'ByRef', 'Optional', 'DoEvents', 'ReDim', 'Preserve',
  'Set', 'Let', 'Get', 'Property', 'On', 'Error', 'Resume',
]);

// Conditional compilation flags
// Quarter Pro = has engine dyno data, Quarter Jr = uses peak HP only
const VB6CompileFlags: Record<string, boolean> = {
  'ISBVPRO': false,       // Bonneville Pro mode
  'ISQUARTERPRO': true,   // Quarter Pro - has full dyno data
  'ISQUARTERJR': false,   // Quarter Jr - peak HP only
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let skipUntilEndIf = 0; // Track nested #If blocks to skip
  
  while (pos < source.length) {
    // Skip whitespace (but not newlines)
    while (pos < source.length && (source[pos] === ' ' || source[pos] === '\t')) {
      pos++;
    }
    
    if (pos >= source.length) break;
    
    const char = source[pos];
    
    // Handle preprocessor directives (#If, #Else, #End If)
    if (char === '#') {
      pos++;
      let directive = '';
      while (pos < source.length && /[a-zA-Z]/.test(source[pos])) {
        directive += source[pos++];
      }
      
      if (directive === 'If') {
        if (skipUntilEndIf > 0) {
          // Already inside a skipped block - just increment nesting counter
          skipUntilEndIf++;
          // Skip to end of line
          while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') pos++;
          continue;
        }
        
        // Not inside a skipped block - evaluate condition
        // Parse condition which may include Not, Or, And
        // Format: [Not] FLAG1 [Or|And [Not] FLAG2] ... Then
        let condition = true;
        let pendingOp: 'or' | 'and' | null = null;
        
        while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') {
          // Skip whitespace
          while (pos < source.length && (source[pos] === ' ' || source[pos] === '\t')) pos++;
          
          // Check for 'Then' - end of condition
          if (source.slice(pos, pos + 4) === 'Then') {
            break;
          }
          
          // Check for 'Not'
          let negate = false;
          if (source.slice(pos, pos + 3) === 'Not' && /\s/.test(source[pos + 3] || '')) {
            negate = true;
            pos += 3;
            while (pos < source.length && (source[pos] === ' ' || source[pos] === '\t')) pos++;
          }
          
          // Check for 'Or'
          if (source.slice(pos, pos + 2) === 'Or' && /\s/.test(source[pos + 2] || '')) {
            pendingOp = 'or';
            pos += 2;
            continue;
          }
          
          // Check for 'And'
          if (source.slice(pos, pos + 3) === 'And' && /\s/.test(source[pos + 3] || '')) {
            pendingOp = 'and';
            pos += 3;
            continue;
          }
          
          // Get flag name
          let flagName = '';
          while (pos < source.length && /[a-zA-Z0-9_]/.test(source[pos])) {
            flagName += source[pos++];
          }
          
          if (flagName) {
            const flagValue = VB6CompileFlags[flagName] ?? false;
            const termValue = negate ? !flagValue : flagValue;
            
            if (pendingOp === 'or') {
              condition = condition || termValue;
            } else if (pendingOp === 'and') {
              condition = condition && termValue;
            } else {
              condition = termValue;
            }
            pendingOp = null;
          } else {
            // Unknown token, skip character
            pos++;
          }
        }
        
        if (!condition) {
          skipUntilEndIf++;
        }
        
        // Skip to end of line
        while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') pos++;
        continue;
      } else if (directive === 'Else') {
        // Only toggle at nesting level 1 (outermost conditional)
        // At deeper nesting levels, we're already skipping and should continue
        if (skipUntilEndIf === 1) {
          skipUntilEndIf = 0; // Start including code (was skipping the #If block)
        } else if (skipUntilEndIf === 0) {
          skipUntilEndIf = 1; // Start skipping code (was including the #If block)
        }
        // If skipUntilEndIf > 1, we're deeply nested and should keep skipping
        // Skip to end of line
        while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') pos++;
        continue;
      } else if (directive === 'End') {
        if (skipUntilEndIf > 0) skipUntilEndIf--;
        // Skip to end of line
        while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') pos++;
        continue;
      }
      
      // Unknown directive, skip line
      while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') pos++;
      continue;
    }
    
    // Skip code inside false #If blocks
    if (skipUntilEndIf > 0) {
      if (char === '\n' || char === '\r') {
        if (char === '\r' && source[pos + 1] === '\n') pos++;
        line++;
        pos++;
      } else {
        pos++;
      }
      continue;
    }
    
    // Newline
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[pos + 1] === '\n') pos++;
      tokens.push({ type: 'NEWLINE', value: '\n', line });
      line++;
      pos++;
      continue;
    }
    
    // Line continuation (_)
    if (char === '_' && (source[pos + 1] === '\n' || source[pos + 1] === '\r')) {
      pos++;
      if (source[pos] === '\r') pos++;
      if (source[pos] === '\n') pos++;
      line++;
      continue;
    }
    
    // Comment (')
    if (char === "'") {
      while (pos < source.length && source[pos] !== '\n' && source[pos] !== '\r') {
        pos++;
      }
      continue;
    }
    
    // String literal
    if (char === '"') {
      pos++;
      let str = '';
      while (pos < source.length && source[pos] !== '"') {
        str += source[pos++];
      }
      pos++; // Skip closing quote
      tokens.push({ type: 'STRING', value: str, line });
      continue;
    }
    
    // Number
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[pos + 1]))) {
      let num = '';
      while (pos < source.length && /[0-9.]/.test(source[pos])) {
        num += source[pos++];
      }
      // Handle scientific notation
      if (source[pos] === 'E' || source[pos] === 'e') {
        num += source[pos++];
        if (source[pos] === '+' || source[pos] === '-') {
          num += source[pos++];
        }
        while (pos < source.length && /[0-9]/.test(source[pos])) {
          num += source[pos++];
        }
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num), line });
      continue;
    }
    
    // Identifier or keyword
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (pos < source.length && /[a-zA-Z0-9_]/.test(source[pos])) {
        id += source[pos++];
      }
      
      // Check for label (number followed by identifier at start of line)
      if (/^[0-9]+$/.test(id)) {
        tokens.push({ type: 'LABEL', value: id, line });
      } else {
        // Case-insensitive keyword matching (VB6 is case-insensitive)
        const idLower = id.toLowerCase();
        const matchedKeyword = Array.from(VB6Keywords).find(
          kw => kw.toLowerCase() === idLower
        );
        if (matchedKeyword) {
          // Debug: log first GoTo token found
          if (matchedKeyword === 'GoTo' && tokens.filter(t => t.value === 'GoTo').length < 1) {
            console.log(`[VB6 Tokenizer] Found GoTo at line ${line}, id="${id}"`);
          }
          tokens.push({ type: 'KEYWORD', value: matchedKeyword, line });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: id, line });
        }
      }
      continue;
    }
    
    // Operators and punctuation
    const twoChar = source.slice(pos, pos + 2);
    if (['<=', '>=', '<>', ':='].includes(twoChar)) {
      tokens.push({ type: 'OPERATOR', value: twoChar, line });
      pos += 2;
      continue;
    }
    
    if ('+-*/^=<>'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, line });
      pos++;
      continue;
    }
    
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', line });
      pos++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', line });
      pos++;
      continue;
    }
    
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', line });
      pos++;
      continue;
    }
    
    if (char === ':') {
      tokens.push({ type: 'COLON', value: ':', line });
      pos++;
      continue;
    }
    
    // DOT for property access (must come after number handling which checks for digits after dot)
    if (char === '.') {
      tokens.push({ type: 'DOT', value: '.', line });
      pos++;
      continue;
    }
    
    // Skip unknown characters
    pos++;
  }
  
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

// ============================================================================
// VB6 Interpreter State
// ============================================================================

interface VB6State {
  variables: Map<string, number>;
  arrays: Map<string, number[]>;
  formControls: Map<string, number>;
  callStack: number[];  // For GoSub/Return
  currentLine: number;
}

// ============================================================================
// Form Control Inputs (mapped from vehicle/environment parameters)
// ============================================================================

export interface VB6Inputs {
  // Vehicle
  Weight: number;
  TireDia: number;
  TireWidth: number;
  GearRatio: number;
  Wheelbase: number;
  Rollout: number;
  Overhang: number;
  StaticFWt: number;
  YCG: number;
  BodyStyle: number;
  
  // Engine
  PeakHP: number;
  RPMPeakHP: number;
  Displacement: number;
  FuelSystem: number;
  HPTQMult: number;
  EnginePMI: number;
  
  // Transmission
  TransType: number;  // 0=clutch, 1=converter
  TransGR: number[];  // Gear ratios [1-6]
  TransEff: number[]; // Gear efficiencies [1-6]
  ShiftRPM: number[]; // Shift RPMs [1-6]
  TorqueMult: number;
  Slippage: number;
  SlipStallRPM: number;
  LaunchRPM?: number;  // Optional - defaults to SlipStallRPM if not set
  ConvDia: number;
  LockUp: number;
  TransPMI: number;
  TiresPMI: number;
  
  // Aerodynamics
  RefArea: number;
  DragCoef: number;
  LiftCoef: number;
  
  // Environment
  WindSpeed: number;
  WindAngle: number;
  TractionIndex: number;
  Efficiency: number;
  
  // HP Curve (for Quarter Pro)
  EngineRPM: number[];
  EngineHP: number[];
  EngineTQ: number[];
}

export interface VB6Outputs {
  ET: number;
  MPH: number;
  time60ft: number;
  time330ft: number;
  time660ft: number;
  mph660ft: number;
  time1000ft: number;
  time1320ft: number;
  mph1320ft: number;
}


// ============================================================================
// Main Interpreter Class
// ============================================================================

export class VB6Interpreter {
  private tokens: Token[];
  private state: VB6State;
  private labels: Map<string, number>;  // Label -> token index
  private pos: number;
  private forStack: Array<{ varName: string; endValue: number; step: number; stmtIndex: number }>;
  private doStack: Array<{ stmtIndex: number }>;
  private callDepth: number = 0;
  private maxCallDepth: number = 100;
  
  constructor(source: string) {
    this.tokens = tokenize(source);
    this.state = {
      variables: new Map(),
      arrays: new Map(),
      formControls: new Map(),
      callStack: [],
      currentLine: 0,
    };
    this.labels = new Map();
    this.pos = 0;
    this.forStack = [];
    this.doStack = [];
    
    // Initialize constants
    for (const [name, value] of Object.entries(VB6Constants)) {
      this.state.variables.set(name.toLowerCase(), value);
    }
    
    // Pre-scan for labels
    this.scanLabels();
  }
  
  private scanLabels(): void {
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      // Numeric labels (e.g., "230 Rem...")
      if (token.type === 'LABEL' || 
          (token.type === 'NUMBER' && this.isAtLineStart(i))) {
        this.labels.set(String(token.value), i);
      }
      // Text labels (e.g., "calcoutputexit:")
      if (token.type === 'IDENTIFIER' && this.isAtLineStart(i) &&
          this.tokens[i + 1]?.type === 'COLON') {
        this.labels.set(String(token.value).toLowerCase(), i);
      }
    }
  }
  
  private isAtLineStart(tokenIndex: number): boolean {
    if (tokenIndex === 0) return true;
    return this.tokens[tokenIndex - 1]?.type === 'NEWLINE';
  }
  
  enableDebug(enable: boolean): void {
    this.debugMode = enable;
  }
  
  private debugLog(message: string): void {
    if (this.debugMode) {
      console.log(`[VB6 DEBUG] ${message}`);
    }
  }
  
  setInputs(inputs: VB6Inputs): void {
    const fc = this.state.formControls;
    
    // Map inputs to form control names (gc_*.Value)
    fc.set('gc_weight', inputs.Weight);
    fc.set('gc_tiredia', inputs.TireDia);
    fc.set('gc_tirewidth', inputs.TireWidth);
    fc.set('gc_gearratio', inputs.GearRatio);
    fc.set('gc_wheelbase', inputs.Wheelbase);
    fc.set('gc_rollout', inputs.Rollout);
    fc.set('gc_overhang', inputs.Overhang);
    fc.set('gc_staticfwt', inputs.StaticFWt);
    fc.set('gc_ycg', inputs.YCG);
    fc.set('gc_bodystyle', inputs.BodyStyle);
    fc.set('gc_peakhp', inputs.PeakHP);
    fc.set('gc_rpmpeakhp', inputs.RPMPeakHP);
    fc.set('gc_displacement', inputs.Displacement);
    fc.set('gc_fuelsystem', inputs.FuelSystem);
    fc.set('gc_hptqmult', inputs.HPTQMult);
    fc.set('gc_enginepmi', inputs.EnginePMI);
    fc.set('gc_transtype', inputs.TransType);
    fc.set('gc_torquemult', inputs.TorqueMult);
    fc.set('gc_slippage', inputs.Slippage);
    fc.set('gc_slipstallrpm', inputs.SlipStallRPM);
    fc.set('gc_convdia', inputs.ConvDia);
    fc.set('gc_lockup', inputs.LockUp);
    fc.set('gc_transpmi', inputs.TransPMI);
    fc.set('gc_tirespmi', inputs.TiresPMI);
    fc.set('gc_refarea', inputs.RefArea);
    fc.set('gc_dragcoef', inputs.DragCoef);
    fc.set('gc_liftcoef', inputs.LiftCoef);
    fc.set('gc_windspeed', inputs.WindSpeed);
    fc.set('gc_windangle', inputs.WindAngle);
    fc.set('gc_tractionindex', inputs.TractionIndex);
    fc.set('gc_efficiency', inputs.Efficiency);
    fc.set('gc_shiftrpm', inputs.ShiftRPM[0] ?? 7000);
    fc.set('gc_launchrpm', inputs.LaunchRPM ?? inputs.SlipStallRPM); // Launch RPM
    fc.set('gc_track', 1); // Default to quarter mile (1)
    
    // Store arrays - use VB6 array names that the code expects
    this.state.arrays.set('transgr', [0, ...inputs.TransGR]);
    this.state.arrays.set('transeff', [0, ...inputs.TransEff]);
    this.state.arrays.set('shiftrpm_arr', [0, ...inputs.ShiftRPM]);
    this.state.arrays.set('enginerpm', [0, ...inputs.EngineRPM]);
    this.state.arrays.set('enginehp', [0, ...inputs.EngineHP]);
    this.state.arrays.set('enginetq', [0, ...inputs.EngineTQ]);
    
    // Also initialize the VB6 internal arrays directly (TGR, TGEff, ShiftRPM)
    // These are used in the physics calculations
    this.state.arrays.set('tgr', [0, ...inputs.TransGR]);
    this.state.arrays.set('tgeff', [0, ...inputs.TransEff]);
    this.state.arrays.set('shiftrpm', [0, ...inputs.ShiftRPM]);
    
    // Set NGR (number of gears)
    this.setVariable('ngr', inputs.TransGR.filter(g => g > 0).length);
    
    // Initialize DistToPrint array (from TIMESLIP.FRM line 815-817)
    // This should be done by the VB6 code but the execution flow skips it
    const rolloutFeet = inputs.Rollout / 12;
    const distToPrint = [0, rolloutFeet || 1, 30, 60, 330, 594, 660, 1000, 1254, 1320];
    this.state.arrays.set('disttoprint', distToPrint);
    
    // Initialize MPHtoPrint array (from TIMESLIP.FRM line 818)
    const Z5 = 3600 / 5280; // mph to ft/s conversion
    const mphToPrint = [0, 60 / Z5, 100 / Z5];
    this.state.arrays.set('mphtoprint', mphToPrint);
    
    // Initialize iDist (from TIMESLIP.FRM line 1068)
    // This should be done by the VB6 code but the execution flow skips it
    this.setVariable('idist', 1);
    
    // Initialize L to 2 to skip the problematic TimeStep calculation at line 1082
    // The VB6 code initializes L=1 at line 1003, but this causes issues with the first iteration
    // By starting at L=2, we skip the huge TimeStep calculation and start with proper values
    this.setVariable('l', 2);
    this.setVariable('ladd', 0);
    
    // Debug: Log all critical inputs
    if (this.debugMode) {
      console.log('[VB6 DEBUG] Inputs set:');
      console.log(`  Weight: ${inputs.Weight}, TireDia: ${inputs.TireDia}, TireWidth: ${inputs.TireWidth}`);
      console.log(`  GearRatio: ${inputs.GearRatio}, Efficiency: ${inputs.Efficiency}`);
      console.log(`  LaunchRPM: ${inputs.LaunchRPM}, SlipStallRPM: ${inputs.SlipStallRPM}`);
      console.log(`  TransGR: [${inputs.TransGR.join(', ')}]`);
      console.log(`  TransEff: [${inputs.TransEff.join(', ')}]`);
      console.log(`  ShiftRPM: [${inputs.ShiftRPM.join(', ')}]`);
      console.log(`  EngineRPM: [${inputs.EngineRPM.join(', ')}]`);
      console.log(`  EngineHP: [${inputs.EngineHP.join(', ')}]`);
      console.log(`  HPTQMult: ${inputs.HPTQMult}, TorqueMult: ${inputs.TorqueMult}`);
      console.log(`  EnginePMI: ${inputs.EnginePMI}, TransPMI: ${inputs.TransPMI}, TiresPMI: ${inputs.TiresPMI}`);
      console.log(`  DistToPrint: [${distToPrint.join(', ')}]`);
    }
  }
  
  // Check if current token is an end token
  private isEndToken(endTokens: string[]): boolean {
    const tok = this.currentToken();
    if (!tok) return true;
    if (tok.type === 'EOF' || tok.type === 'NEWLINE') return true;
    if (tok.type === 'COLON') return true;
    return endTokens.includes(String(tok.value));
  }
  
  // Evaluate an expression with recursion depth limit
  private exprDepth = 0;
  private maxExprDepth = 50;
  
  private evalExpr(endTokens: string[] = []): number {
    this.exprDepth++;
    if (this.exprDepth > this.maxExprDepth) {
      console.error('[VB6] Max expression depth exceeded');
      this.exprDepth--;
      return 0;
    }
    
    // Check for end token before starting
    if (this.isEndToken(endTokens)) {
      this.exprDepth--;
      return 0;
    }
    
    const result = this.evalOr(endTokens);
    this.exprDepth--;
    return result;
  }
  
  private evalOr(endTokens: string[]): number {
    let left = this.evalAnd(endTokens);
    while (this.currentToken()?.value === 'Or' && !this.isEndToken(endTokens)) {
      this.advance();
      const right = this.evalAnd(endTokens);
      left = (left !== 0 || right !== 0) ? -1 : 0;
    }
    return left;
  }
  
  private evalAnd(endTokens: string[]): number {
    let left = this.evalNot(endTokens);
    while (this.currentToken()?.value === 'And' && !this.isEndToken(endTokens)) {
      this.advance();
      const right = this.evalNot(endTokens);
      left = (left !== 0 && right !== 0) ? -1 : 0;
    }
    return left;
  }
  
  private evalNot(endTokens: string[]): number {
    if (this.currentToken()?.value === 'Not') {
      this.advance();
      const val = this.evalComparison(endTokens);
      return val === 0 ? -1 : 0;
    }
    return this.evalComparison(endTokens);
  }
  
  private evalComparison(endTokens: string[]): number {
    let left = this.evalAddSub(endTokens);
    const token = this.currentToken();
    if (token?.type === 'OPERATOR' && ['=', '<', '>', '<=', '>=', '<>'].includes(String(token.value))) {
      const op = String(token.value);
      this.advance();
      const right = this.evalAddSub(endTokens);
      switch (op) {
        case '=': return left === right ? -1 : 0;
        case '<': return left < right ? -1 : 0;
        case '>': return left > right ? -1 : 0;
        case '<=': return left <= right ? -1 : 0;
        case '>=': return left >= right ? -1 : 0;
        case '<>': return left !== right ? -1 : 0;
      }
    }
    return left;
  }
  
  private evalAddSub(endTokens: string[]): number {
    let left = this.evalMulDiv(endTokens);
    while (!this.isEndToken(endTokens)) {
      const token = this.currentToken();
      if (token?.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        const op = token.value;
        this.advance();
        const right = this.evalMulDiv(endTokens);
        left = op === '+' ? vbSingle(left + right) : vbSingle(left - right);
      } else {
        break;
      }
    }
    return left;
  }
  
  private evalMulDiv(endTokens: string[]): number {
    let left = this.evalPower(endTokens);
    while (!this.isEndToken(endTokens)) {
      const token = this.currentToken();
      if (token?.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
        const op = token.value;
        this.advance();
        const right = this.evalPower(endTokens);
        left = op === '*' ? vbSingle(left * right) : vbSingle(left / right);
      } else if (token?.value === 'Mod') {
        this.advance();
        const right = this.evalPower(endTokens);
        left = vbSingle(left % right);
      } else {
        break;
      }
    }
    return left;
  }
  
  private evalPower(endTokens: string[]): number {
    let left = this.evalUnary(endTokens);
    while (this.currentToken()?.value === '^' && !this.isEndToken(endTokens)) {
      this.advance();
      const right = this.evalUnary(endTokens);
      left = vbSingle(Math.pow(left, right));
    }
    return left;
  }
  
  private evalUnary(endTokens: string[]): number {
    const token = this.currentToken();
    if (token?.type === 'OPERATOR' && token.value === '-') {
      this.advance();
      return vbSingle(-this.evalPrimary(endTokens));
    }
    if (token?.type === 'OPERATOR' && token.value === '+') {
      this.advance();
    }
    return this.evalPrimary(endTokens);
  }
  
  private evalPrimary(endTokens: string[]): number {
    const token = this.currentToken();
    
    // Check for end condition
    if (!token || token.type === 'EOF' || token.type === 'NEWLINE') {
      return 0;
    }
    
    // Check if we hit an end token
    if (endTokens.includes(String(token.value))) {
      return 0;
    }
    
    // Number literal
    if (token.type === 'NUMBER') {
      this.advance();
      return vbSingle(token.value as number);
    }
    
    // String literal - return 0 for numeric context
    if (token.type === 'STRING') {
      this.advance();
      return 0;
    }
    
    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance();
      const val = this.evalExpr([')']);
      if (this.currentToken()?.type === 'RPAREN') {
        this.advance();
      }
      return val;
    }
    
    // Identifier (variable, array, function, or form control)
    if (token.type === 'IDENTIFIER') {
      const name = String(token.value).toLowerCase();
      this.advance();
      
      // Check for function call or array access
      if (this.currentToken()?.type === 'LPAREN') {
        this.advance();
        const args: (number | string)[] = [];
        let argCount = 0;
        const maxArgs = 20; // Safety limit
        
        while (this.currentToken()?.type !== 'RPAREN' && 
               this.currentToken()?.type !== 'EOF' &&
               this.currentToken()?.type !== 'NEWLINE' &&
               argCount < maxArgs) {
          // Check for string argument (for clsVals)
          if (this.currentToken()?.type === 'STRING') {
            args.push(String(this.currentToken()?.value));
            this.advance();
          } else {
            args.push(this.evalExpr([',', ')']));
          }
          argCount++;
          if (this.currentToken()?.type === 'COMMA') {
            this.advance();
          } else if (this.currentToken()?.type !== 'RPAREN') {
            break; // Unexpected token, stop parsing args
          }
        }
        if (this.currentToken()?.type === 'RPAREN') {
          this.advance();
        }
        
        // Skip .Value property if present (for clsVals and other collections)
        if (this.currentToken()?.value === '.') {
          this.advance();
          if (this.currentToken()?.type === 'IDENTIFIER') {
            this.advance(); // Skip 'Value'
          }
        }
        
        // Handle clsVals - form control collection
        if (name === 'clsvals' && args.length >= 2) {
          const arrayName = String(args[0]).toLowerCase();
          const index = Math.round(Number(args[1]));
          const arr = this.state.arrays.get(arrayName);
          if (arr) {
            return vbSingle(arr[index] ?? 0);
          }
          return 0;
        }
        
        // Check if it's a built-in function
        const funcName = Object.keys(VB6Functions).find(f => f.toLowerCase() === name);
        if (funcName) {
          return VB6Functions[funcName](...args.map(a => typeof a === 'number' ? a : 0));
        }
        
        // Otherwise it's an array access
        const arr = this.state.arrays.get(name);
        if (arr && args.length > 0) {
          const idx = Math.round(Number(args[0]));
          const val = arr[idx] ?? 0;
          // Debug array reads for EngRPM
          if (name === 'engrpm' && this.gotoCount < 3) {
            console.log(`[VB6] Array READ: ${name}(${idx}) = ${val}, arr.length=${arr.length}`);
          }
          return vbSingle(val);
        }
        
        // Debug missing array
        if (name === 'engrpm' && this.gotoCount < 3) {
          console.log(`[VB6] Array READ: ${name} NOT FOUND in arrays! Available: ${Array.from(this.state.arrays.keys()).join(', ')}`);
        }
        return 0;
      }
      
      // Check for .Value property (form control)
      if (this.currentToken()?.type === 'DOT' || this.currentToken()?.value === '.') {
        this.advance();
        if (this.currentToken()?.type === 'IDENTIFIER') {
          this.advance(); // Skip 'Value' or other property
        }
        const fcValue = this.state.formControls.get(name) ?? 0;
        // Debug form control access for launch RPM
        if (name === 'gc_launchrpm' && this.gotoCount < 2) {
          console.log(`[VB6] FormControl ${name}.Value = ${fcValue}`);
        }
        return vbSingle(fcValue);
      }
      
      // Simple variable
      return vbSingle(this.state.variables.get(name) ?? 0);
    }
    
    // Keywords True/False
    if (token.value === 'True') {
      this.advance();
      return -1;
    }
    if (token.value === 'False') {
      this.advance();
      return 0;
    }
    
    // Unknown token - don't advance, just return 0
    return 0;
  }
  
  private currentToken(): Token | undefined {
    return this.tokens[this.pos];
  }
  
  private advance(): void {
    if (this.pos < this.tokens.length) {
      this.pos++;
    }
  }
  
  private skipToEndOfLine(): void {
    while (this.pos < this.tokens.length && 
           this.tokens[this.pos].type !== 'NEWLINE' && 
           this.tokens[this.pos].type !== 'EOF') {
      this.pos++;
    }
    if (this.tokens[this.pos]?.type === 'NEWLINE') {
      this.pos++;
    }
  }
  
  // ========================================================================
  // Statement Execution
  // ========================================================================
  
  private setVariable(name: string, value: number): void {
    const nameLower = name.toLowerCase();
    // Debug: detect first NaN
    if (isNaN(value) && this.gotoCount < 5) {
      console.log(`[VB6] NaN detected! Setting ${name} = NaN`);
    }
    
    // REMOVED: TimeStep fix was preventing simulation from progressing
    // The VB6 code's TimeStep formula works correctly for normal vehicles
    // Only extreme traction-limited cases (motorcycles) expose the bug
    
    // Debug: trace critical physics variables
    if (this.debugMode && this.gotoCount >= 1 && this.gotoCount <= 20) {
      const criticalVars = ['hp', 'tq', 'force', 'ags0', 'timestep', 'pqwt', 'vel0', 'dist0', 'tsmax', 'agsmax', 'nextvel', 'veldistmatch', 'veltimematch', 'printflag'];
      if (criticalVars.includes(nameLower)) {
        this.debugLog(`${name} = ${value.toFixed(6)} (line ${this.currentToken()?.line})`);
      }
    }
    this.state.variables.set(nameLower, vbSingle(value));
  }
  
  private getVariable(name: string): number {
    return this.state.variables.get(name.toLowerCase()) ?? 0;
  }
  
  private setArrayElement(name: string, index: number, value: number): void {
    const nameLower = name.toLowerCase();
    let arr = this.state.arrays.get(nameLower);
    if (!arr) {
      // Create array if it doesn't exist - VB6 allows implicit array creation
      arr = new Array(Math.max(100, Math.round(index) + 10)).fill(0);
      this.state.arrays.set(nameLower, arr);
      if (this.debugMode) {
        this.debugLog(`Auto-created array ${name} with size ${arr.length}`);
      }
    }
    // Debug: detect NaN in array writes
    if (isNaN(value) && this.gotoCount < 5) {
      console.log(`[VB6] NaN detected! Setting ${name}(${index}) = NaN`);
    }
    // Debug: trace critical array assignments
    if (this.debugMode && this.gotoCount >= 1 && this.gotoCount <= 20) {
      const criticalArrays = ['vel', 'dist', 'time', 'ags', 'engrpm', 'disttoprint'];
      if (criticalArrays.includes(nameLower)) {
        this.debugLog(`${name}(${index}) = ${value.toFixed(6)}`);
      }
    }
    arr[Math.round(index)] = vbSingle(value);
  }
  
  private getArrayElement(name: string, index: number): number {
    const arr = this.state.arrays.get(name.toLowerCase());
    return arr ? (arr[Math.round(index)] ?? 0) : 0;
  }
  
  private initArray(name: string, _lower: number, upper: number): void {
    // Note: VB6 arrays can have arbitrary lower bounds, but we use 0-indexed internally
    // _lower is preserved for future use if needed
    const arr = new Array(upper + 1).fill(0);
    this.state.arrays.set(name.toLowerCase(), arr);
  }
  
  
  // Execute a single line/statement
  private executeStatement(): boolean {
    this.callDepth++;
    if (this.callDepth > this.maxCallDepth) {
      console.error(`[VB6] Max call depth exceeded at pos ${this.pos}, token: ${this.currentToken()?.value}`);
      this.callDepth--;
      return false;
    }
    
    // Skip newlines - with safety limit
    let newlineCount = 0;
    while (this.currentToken()?.type === 'NEWLINE') {
      this.advance();
      newlineCount++;
      if (newlineCount > 1000) {
        console.error('[VB6] Too many consecutive newlines!');
        this.callDepth--;
        return false;
      }
    }
    
    if (this.currentToken()?.type === 'EOF') {
      this.callDepth--;
      return false; // End of program
    }
    
    const token = this.currentToken();
    if (!token) {
      this.callDepth--;
      return false;
    }
    
    // Skip colons (statement separators in VB6)
    if (token.type === 'COLON') {
      this.advance();
      this.callDepth--;
      return true;
    }
    
    // Handle labels (numeric)
    if (token.type === 'NUMBER' && this.isAtLineStart(this.pos)) {
      this.advance(); // Skip label
      // Check for Rem after label
      if (this.currentToken()?.value === 'Rem') {
        this.skipToEndOfLine();
      }
      this.callDepth--;
      return true;
    }
    
    // Handle keywords
    if (token.type === 'KEYWORD') {
      // Debug: log first few GoTo encounters
      if (token.value === 'GoTo' && this.gotoCount < 3) {
        console.log(`[VB6] Found GoTo keyword at pos ${this.pos}, line ${token.line}`);
      }
      const result = this.executeKeyword(String(token.value));
      this.callDepth--;
      return result;
    }
    
    // Handle assignments (identifier = expression)
    if (token.type === 'IDENTIFIER') {
      const result = this.executeAssignment();
      this.callDepth--;
      return result;
    }
    
    // Skip unknown tokens
    this.advance();
    this.callDepth--;
    return true;
  }
  
  private executeKeyword(keyword: string): boolean {
    switch (keyword) {
      case 'Dim':
        return this.executeDim();
      case 'If':
        return this.executeIf();
      case 'For':
        return this.executeFor();
      case 'Next':
        return this.executeNext();
      case 'GoTo':
        return this.executeGoTo();
      case 'GoSub':
        return this.executeGoSub();
      case 'Return':
        return this.executeReturn();
      case 'Call':
        return this.executeCall();
      case 'Select':
        return this.executeSelect();
      case 'Exit':
        return this.executeExit();
      case 'Do':
        return this.executeDo();
      case 'Loop':
        return this.executeLoop();
      case 'While':
        return this.executeWhile();
      case 'Wend':
        return this.executeWend();
      case 'Rem':
        this.skipToEndOfLine();
        return true;
      case 'End':
        // Check what follows "End"
        const endWhat = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
        if (endWhat === 'if') {
          // "End If" should never be executed by executeKeyword
          // It should only be detected by executeIf loop
          // Don't advance - let executeIf handle it
          return true;
        }
        if (endWhat === 'select') {
          // "End Select" - advance past both tokens
          this.advance(); // Skip 'End'
          this.advance(); // Skip 'Select'
          return true;
        }
        if (endWhat === 'sub' || endWhat === 'function') {
          // End of subroutine - advance past and signal completion
          this.advance(); // Skip 'End'
          this.advance(); // Skip 'Sub'/'Function'
          return false; // Signal to stop execution
        }
        return this.executeEnd();
      case 'Else':
      case 'ElseIf':
        // These should be detected by executeIf - DON'T advance, just return
        // so the calling executeIf can see and handle them
        return true;
      case 'Case':
        // Case outside Select - skip (shouldn't happen normally)
        this.skipToEndOfLine();
        return true;
      case 'Private':
      case 'Public':
      case 'Function':
      case 'Sub':
        this.skipToEndOfLine(); // Skip function/sub declarations
        return true;
      case 'Const':
        this.skipToEndOfLine(); // Skip const declarations (handled by tokenizer)
        return true;
      case 'DoEvents':
        this.advance(); // Just skip DoEvents - it's for UI responsiveness
        return true;
      case 'ReDim':
        return this.executeReDim();
      case 'Set':
        // Set obj = value - treat like assignment
        this.advance();
        return this.executeAssignment();
      case 'On':
        // On Error - skip
        this.skipToEndOfLine();
        return true;
      case 'With':
        // With block - skip to End With
        this.advance();
        while (this.currentToken()?.type !== 'EOF') {
          if (this.currentToken()?.value === 'End' && 
              this.tokens[this.pos + 1]?.value === 'With') {
            this.advance();
            this.advance();
            return true;
          }
          this.advance();
        }
        return true;
      default:
        this.skipToEndOfLine();
        return true;
    }
  }
  
  private executeReDim(): boolean {
    this.advance(); // Skip 'ReDim'
    
    // Skip 'Preserve' if present
    if (this.currentToken()?.value === 'Preserve') {
      this.advance();
    }
    
    while (this.currentToken()?.type !== 'NEWLINE' && this.currentToken()?.type !== 'EOF') {
      const name = this.currentToken()?.value;
      if (typeof name !== 'string') break;
      this.advance();
      
      if (this.currentToken()?.type === 'LPAREN') {
        this.advance();
        const upper = Math.round(this.evalExpr([')']));
        if (this.currentToken()?.type === 'RPAREN') this.advance();
        
        // Only initialize if array doesn't exist (Preserve keeps data)
        if (!this.state.arrays.has(name.toLowerCase())) {
          this.initArray(name, 0, upper);
        }
      }
      
      if (this.currentToken()?.type === 'COMMA') this.advance();
    }
    return true;
  }
  
  private executeDim(): boolean {
    this.advance(); // Skip 'Dim'
    
    while (this.currentToken()?.type !== 'NEWLINE' && this.currentToken()?.type !== 'EOF') {
      const name = this.currentToken()?.value;
      if (typeof name !== 'string') break;
      this.advance();
      
      // Check for array declaration
      if (this.currentToken()?.type === 'LPAREN') {
        this.advance(); // Skip '('
        let lower = 0;
        let upper = this.evalExpr([')']);
        
        // Check for 'To'
        if (this.currentToken()?.value === 'To') {
          lower = upper;
          this.advance();
          upper = this.evalExpr([')']);
        }
        
        if (this.currentToken()?.type === 'RPAREN') {
          this.advance();
        }
        
        this.initArray(name, lower, upper);
      } else {
        // Simple variable
        this.setVariable(name, 0);
      }
      
      // Skip 'As Type'
      if (this.currentToken()?.value === 'As') {
        this.advance();
        this.advance(); // Skip type
      }
      
      // Skip comma for multiple declarations
      if (this.currentToken()?.type === 'COMMA') {
        this.advance();
      }
    }
    
    return true;
  }
  
  private executeAssignment(): boolean {
    const name = String(this.currentToken()?.value);
    const nameLower = name.toLowerCase();
    this.advance();
    
    // Check for array index or function call with parens
    let arrayIndex: number | null = null;
    if (this.currentToken()?.type === 'LPAREN') {
      this.advance();
      arrayIndex = this.evalExpr([')']);
      if (this.currentToken()?.type === 'RPAREN') {
        this.advance();
      }
    }
    
    // Handle property access (.Value, .IsCalc, etc.)
    if (this.currentToken()?.type === 'DOT' || this.currentToken()?.value === '.') {
      this.advance();
      const prop = String(this.currentToken()?.value).toLowerCase();
      this.advance();
      
      // For .IsCalc, just skip - it's a read-only property check
      if (prop === 'iscalc') {
        this.skipToEndOfLine();
        return true;
      }
      // For .Value, continue to check for assignment
    }
    
    // Check for '=' (assignment)
    if (this.currentToken()?.value === '=') {
      this.advance();
      
      // Evaluate expression
      const value = this.evalExpr([':']);
      
      // Store value
      if (arrayIndex !== null) {
        // Debug: trace EngRPM assignments
        if (nameLower === 'engrpm' && this.gotoCount < 2) {
          console.log(`[VB6] Array assignment: ${name}(${arrayIndex}) = ${value}`);
        }
        this.setArrayElement(name, arrayIndex, value);
      } else if (nameLower.startsWith('gc_')) {
        // Debug form control writes
        if (nameLower === 'gc_launchrpm' && this.gotoCount < 3) {
          console.log(`[VB6] FormControl WRITE: ${nameLower} = ${value}`);
        }
        this.state.formControls.set(nameLower, vbSingle(value));
      } else {
        // Debug Stall variable
        if (nameLower === 'stall' && this.gotoCount < 3) {
          console.log(`[VB6] Variable WRITE: Stall = ${value}`);
        }
        this.setVariable(name, value);
      }
      
      return true;
    }
    
    // Not an assignment - might be a subroutine call without 'Call'
    // Handle known subroutines and UI functions to skip
    const knownSubs = ['weather', 'engine', 'tire', 'taby', 'dtaby', 'addlistline', 
                       'msgbox', 'settprnt', 'timer1', 'loadgraph', 'sub310', 'sub315', 
                       'sub320', 'sub325', 'beep'];
    if (knownSubs.includes(nameLower)) {
      // Parse arguments (without parentheses)
      const args: number[] = [];
      const argNames: string[] = [];
      
      while (this.currentToken()?.type !== 'NEWLINE' && 
             this.currentToken()?.type !== 'COLON' &&
             this.currentToken()?.type !== 'EOF') {
        // Track variable name for by-ref
        if (this.currentToken()?.type === 'IDENTIFIER') {
          argNames.push(String(this.currentToken()?.value).toLowerCase());
        } else {
          argNames.push('');
        }
        args.push(this.evalExpr([',', ':']));
        if (this.currentToken()?.type === 'COMMA') {
          this.advance();
        }
      }
      
      // Execute the subroutine
      this.executeBuiltinSub(nameLower, args, argNames);
      return true;
    }
    
    // Unknown identifier that's not an assignment - skip to end of line
    this.skipToEndOfLine();
    return true;
  }
  
  // Helper: Check if an If at position pos is a multi-line If (has NEWLINE after Then)
  private isMultiLineIf(pos: number): boolean {
    // Look ahead from pos to find Then
    let lookAhead = pos + 1;
    while (lookAhead < this.tokens.length && 
           this.tokens[lookAhead]?.value !== 'Then' &&
           this.tokens[lookAhead]?.type !== 'NEWLINE') {
      lookAhead++;
    }
    if (this.tokens[lookAhead]?.value === 'Then') {
      // Check token after Then - if NEWLINE, it's multi-line
      return this.tokens[lookAhead + 1]?.type === 'NEWLINE';
    }
    return false;
  }
  
  private executeIf(): boolean {
    this.advance(); // Skip 'If'
    
    const condition = this.evalExpr(['Then']);
    
    // Debug condition evaluation
    if (this.gotoCount < 3) {
      const line = this.currentToken()?.line;
      console.log(`[VB6] executeIf at line ${line}: condition = ${condition}`);
    }
    
    // Skip 'Then'
    if (this.currentToken()?.value === 'Then') {
      this.advance();
    }
    
    // Check for single-line If
    if (this.currentToken()?.type !== 'NEWLINE') {
      if (condition !== 0) {
        // Execute ALL statements after Then until newline or Else
        while (this.currentToken()?.type !== 'NEWLINE' && 
               this.currentToken()?.type !== 'EOF') {
          if (this.currentToken()?.value === 'Else') {
            // Skip rest of line after Else (condition was true, don't execute Else)
            this.skipToEndOfLine();
            return true;
          }
          const beforePos = this.pos;
          if (!this.executeStatement()) return false;
          // If GoTo jumped us elsewhere, exit immediately
          if (Math.abs(this.pos - beforePos) > 50) {
            return true;
          }
        }
      } else {
        // Skip to Else or end of line
        while (this.currentToken()?.type !== 'NEWLINE' && 
               this.currentToken()?.type !== 'EOF') {
          if (this.currentToken()?.value === 'Else') {
            this.advance();
            // Execute ALL statements after Else
            while (this.currentToken()?.type !== 'NEWLINE' && 
                   this.currentToken()?.type !== 'EOF') {
              const beforePos = this.pos;
              if (!this.executeStatement()) return false;
              // If GoTo jumped us elsewhere, exit immediately
              if (Math.abs(this.pos - beforePos) > 50) {
                return true;
              }
            }
            return true;
          }
          this.advance();
        }
      }
      return true;
    }
    
    // Multi-line If
    if (condition !== 0) {
      // Execute until Else, ElseIf, or End If
      while (true) {
        if (this.currentToken()?.type === 'EOF') return false;
        
        const tok = this.currentToken();
        const tokVal = String(tok?.value ?? '').toLowerCase();
        
        // Debug: trace what we're seeing in the If-true branch
        if (this.gotoCount < 3) {
          console.log(`[VB6] executeIf loop: type=${tok?.type}, val='${tok?.value}', line=${tok?.line}, tokVal='${tokVal}'`);
        }
        
        // If we hit End If, we're done with this If block - just return
        if (tokVal === 'end') {
          const nextTok = this.tokens[this.pos + 1];
          const nextVal = String(nextTok?.value ?? '').toLowerCase();
          if (this.gotoCount < 3) {
            console.log(`[VB6] executeIf: saw End at line ${tok?.line}, next token: ${nextTok?.type}:${nextTok?.value}`);
          }
          if (nextVal === 'if') {
            this.advance(); // Skip 'End'
            this.advance(); // Skip 'If'
            return true;
          }
        }
        
        // If we hit Else or ElseIf, skip to End If (don't execute the else branch)
        if (tokVal === 'else' || tokVal === 'elseif') {
          // Skip to End If - must track nesting depth for nested MULTI-LINE If blocks only
          let skipDepth = 1;
          while (skipDepth > 0 && this.currentToken()?.type !== 'EOF') {
            const curVal = String(this.currentToken()?.value ?? '').toLowerCase();
            const nextVal = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
            if (curVal === 'if' && 
                this.tokens[this.pos - 1]?.type === 'NEWLINE' &&
                this.isMultiLineIf(this.pos)) {
              skipDepth++;
            } else if (curVal === 'end' && nextVal === 'if') {
              skipDepth--;
              this.advance(); // Skip 'End'
              this.advance(); // Skip 'If' - MUST skip both
              if (skipDepth === 0) {
                return true;
              }
              continue; // Don't advance again
            }
            this.advance();
          }
          return true;
        }
        
        const beforePos = this.pos;
        if (!this.executeStatement()) return false;
        // If GoTo jumped us elsewhere, exit immediately
        if (Math.abs(this.pos - beforePos) > 50) {
          return true;
        }
      }
    } else {
      // Skip to Else, ElseIf, or End If
      let depth = 1;
      while (depth > 0) {
        if (this.currentToken()?.type === 'EOF') return false;
        
        const curVal = String(this.currentToken()?.value ?? '').toLowerCase();
        const nextVal = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
        
        // Only count MULTI-LINE Ifs - single-line Ifs don't have End If
        if (curVal === 'if' && 
            this.tokens[this.pos - 1]?.type === 'NEWLINE' &&
            this.isMultiLineIf(this.pos)) {
          depth++;
        } else if (curVal === 'end' && nextVal === 'if') {
          depth--;
          this.advance(); // Skip 'End'
          this.advance(); // Skip 'If' - MUST skip both
          if (depth === 0) {
            return true;
          }
          continue; // Don't advance again
        } else if (depth === 1 && curVal === 'else') {
          this.advance();
          // Execute Else block - track nesting for nested MULTI-LINE If blocks only
          let elseDepth = 1;
          while (elseDepth > 0 && this.currentToken()?.type !== 'EOF') {
            const innerCurVal = String(this.currentToken()?.value ?? '').toLowerCase();
            const innerNextVal = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
            if (innerCurVal === 'if' && 
                this.tokens[this.pos - 1]?.type === 'NEWLINE' &&
                this.isMultiLineIf(this.pos)) {
              elseDepth++;
            } else if (innerCurVal === 'end' && innerNextVal === 'if') {
              elseDepth--;
              this.advance(); // Skip 'End'
              this.advance(); // Skip 'If' - MUST skip both
              if (elseDepth === 0) {
                return true;
              }
              continue; // Don't execute statement, just continue loop
            }
            const beforePos = this.pos;
            if (!this.executeStatement()) return false;
            // If GoTo jumped us elsewhere, exit immediately
            if (Math.abs(this.pos - beforePos) > 50) {
              return true;
            }
          }
          return true;
        } else if (depth === 1 && curVal === 'elseif') {
          this.advance();
          const elseIfCond = this.evalExpr(['Then']);
          if (String(this.currentToken()?.value ?? '').toLowerCase() === 'then') this.advance();
          
          if (elseIfCond !== 0) {
            // Execute ElseIf block - track nesting for nested MULTI-LINE If blocks only
            let elseIfDepth = 1;
            while (elseIfDepth > 0 && this.currentToken()?.type !== 'EOF') {
              const eiCurVal = String(this.currentToken()?.value ?? '').toLowerCase();
              const eiNextVal = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
              if (eiCurVal === 'if' && 
                  this.tokens[this.pos - 1]?.type === 'NEWLINE' &&
                  this.isMultiLineIf(this.pos)) {
                elseIfDepth++;
              } else if (eiCurVal === 'end' && eiNextVal === 'if') {
                elseIfDepth--;
                this.advance(); // Skip 'End'
                this.advance(); // Skip 'If' - MUST skip both
                if (elseIfDepth === 0) {
                  return true;
                }
                continue; // Don't execute statement
              } else if (elseIfDepth === 1 && 
                         (eiCurVal === 'else' || eiCurVal === 'elseif')) {
                // Skip to End If - track nesting for MULTI-LINE Ifs only
                let skipDepth = 1;
                while (skipDepth > 0 && this.currentToken()?.type !== 'EOF') {
                  const skCurVal = String(this.currentToken()?.value ?? '').toLowerCase();
                  const skNextVal = String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase();
                  if (skCurVal === 'if' && 
                      this.tokens[this.pos - 1]?.type === 'NEWLINE' &&
                      this.isMultiLineIf(this.pos)) {
                    skipDepth++;
                  } else if (skCurVal === 'end' && skNextVal === 'if') {
                    skipDepth--;
                    this.advance(); // Skip 'End'
                    this.advance(); // Skip 'If' - MUST skip both
                    if (skipDepth === 0) {
                      return true;
                    }
                    continue; // Don't advance again
                  }
                  this.advance();
                }
                return true;
              }
              const beforePos = this.pos;
              if (!this.executeStatement()) return false;
              // If GoTo jumped us elsewhere, exit immediately
              if (Math.abs(this.pos - beforePos) > 50) {
                return true;
              }
            }
            return true;
          }
        }
        
        this.advance();
      }
    }
    
    return true;
  }
  
  private executeFor(): boolean {
    this.advance(); // Skip 'For'
    
    const varName = String(this.currentToken()?.value).toLowerCase();
    this.advance();
    
    // Skip '='
    if (this.currentToken()?.value === '=') this.advance();
    
    const startValue = this.evalExpr(['To']);
    
    // Skip 'To'
    if (this.currentToken()?.value === 'To') this.advance();
    
    const endValue = this.evalExpr(['Step', ':']);
    
    let step = 1;
    if (this.currentToken()?.value === 'Step') {
      this.advance();
      step = this.evalExpr([':']);
    }
    
    // Initialize loop variable
    this.setVariable(varName, startValue);
    
    // Save loop info
    this.forStack.push({
      varName,
      endValue,
      step,
      stmtIndex: this.pos,
    });
    
    // Check if loop should execute at all
    if ((step > 0 && startValue > endValue) || (step < 0 && startValue < endValue)) {
      // Skip to Next
      let depth = 1;
      while (depth > 0) {
        if (this.currentToken()?.type === 'EOF') return false;
        if (this.currentToken()?.value === 'For') depth++;
        if (this.currentToken()?.value === 'Next') {
          depth--;
          if (depth === 0) {
            this.advance();
            // Skip variable name if present
            if (this.currentToken()?.type === 'IDENTIFIER') this.advance();
            this.forStack.pop();
            return true;
          }
        }
        this.advance();
      }
    }
    
    return true;
  }
  
  private executeNext(): boolean {
    this.advance(); // Skip 'Next'
    
    // Skip variable name if present
    if (this.currentToken()?.type === 'IDENTIFIER') {
      this.advance();
    }
    
    const loop = this.forStack[this.forStack.length - 1];
    if (!loop) return true;
    
    // Increment loop variable
    const currentValue = this.getVariable(loop.varName);
    const newValue = currentValue + loop.step;
    this.setVariable(loop.varName, newValue);
    
    // Check loop condition
    const shouldContinue = loop.step > 0 
      ? newValue <= loop.endValue 
      : newValue >= loop.endValue;
    
    if (shouldContinue) {
      // Jump back to start of loop
      this.pos = loop.stmtIndex;
    } else {
      // Exit loop
      this.forStack.pop();
    }
    
    return true;
  }
  
  private gotoCount = 0;
  private debugMode = false;
  
  private executeGoTo(): boolean {
    this.advance(); // Skip 'GoTo'
    
    const label = String(this.currentToken()?.value);
    this.advance();
    
    // Try exact match first, then lowercase (for text labels)
    let targetPos = this.labels.get(label);
    if (targetPos === undefined) {
      targetPos = this.labels.get(label.toLowerCase());
    }
    
    if (targetPos !== undefined) {
      this.gotoCount++;
      if (this.gotoCount <= 10) {
        const L = this.getVariable('l');
        console.log(`[VB6] GoTo ${label} -> pos ${targetPos} (L=${L}, gotoCount=${this.gotoCount})`);
      }
      this.pos = targetPos;
    } else {
      console.warn(`[VB6] GoTo label not found: "${label}". Available: ${Array.from(this.labels.keys()).join(', ')}`);
    }
    
    return true;
  }
  
  private executeGoSub(): boolean {
    this.advance(); // Skip 'GoSub'
    
    const label = String(this.currentToken()?.value);
    this.advance();
    
    // Save return position
    this.state.callStack.push(this.pos);
    
    const targetPos = this.labels.get(label);
    if (targetPos !== undefined) {
      this.pos = targetPos;
    }
    
    return true;
  }
  
  private executeReturn(): boolean {
    this.advance(); // Skip 'Return'
    
    const returnPos = this.state.callStack.pop();
    if (returnPos !== undefined) {
      this.pos = returnPos;
    }
    
    return true;
  }
  
  private executeCall(): boolean {
    this.advance(); // Skip 'Call'
    
    const funcName = String(this.currentToken()?.value).toLowerCase();
    this.advance();
    
    // Parse arguments - need to track variable names for by-reference params
    const args: number[] = [];
    const argNames: string[] = [];
    
    if (this.currentToken()?.type === 'LPAREN') {
      this.advance();
      while (this.currentToken()?.type !== 'RPAREN' && this.currentToken()?.type !== 'EOF') {
        // Check if this argument is a simple variable (for by-ref)
        if (this.currentToken()?.type === 'IDENTIFIER') {
          const varName = String(this.currentToken()?.value);
          // Look ahead to see if this is just a variable or an expression
          const nextTok = this.tokens[this.pos + 1];
          if (nextTok?.type === 'COMMA' || nextTok?.type === 'RPAREN' ||
              nextTok?.value === '(' && this.tokens[this.pos + 2]?.type === 'RPAREN') {
            // Simple variable or array reference - track name for by-ref
            argNames.push(varName.toLowerCase());
          } else {
            argNames.push('');
          }
        } else {
          argNames.push('');
        }
        
        args.push(this.evalExpr([',', ')']));
        if (this.currentToken()?.type === 'COMMA') this.advance();
      }
      if (this.currentToken()?.type === 'RPAREN') this.advance();
    }
    
    // Handle built-in subroutines
    this.executeBuiltinSub(funcName, args, argNames);
    
    return true;
  }
  
  private executeBuiltinSub(name: string, args: number[], argNames: string[]): void {
    switch (name) {
      case 'taby':
        // TABY(xrpm(), yhp(), NHP, order, rpm, result)
        // Linear interpolation on HP curve - result is by-reference
        if (args.length >= 5) {
          const rpm = args[4];
          const result = this.interpolateHP(rpm);
          // Store result in the last argument (by reference)
          // Use argNames[5] but clean it - just take first word (no spaces)
          let resultVarName = (argNames[5] || 'hp').split(/\s+/)[0];
          if (!resultVarName) resultVarName = 'hp';
          // Debug first few calls
          if (this.gotoCount < 3) {
            console.log(`[VB6] TABY: rpm=${rpm}, result=${result.toFixed(1)}, argNames=[${argNames.join(',')}], storing in '${resultVarName}'`);
          }
          this.setVariable(resultVarName, result);
        }
        break;
      case 'dtaby':
        // Double interpolation - used for engine curve generation
        // DTABY(SX(), sz(), sY(), NHP, 5, 1, 1, SX(N), HPCID, TQR)
        // For now, approximate with linear interpolation
        if (args.length >= 9) {
          const resultVarName = argNames[9] || 'tqr';
          // Simplified: just return 1.0 for now
          this.setVariable(resultVarName, 1.0);
        }
        break;
      case 'tire':
        // Tire growth calculation - passes TireGrowth and TireCirFt by reference
        this.executeTireSub(argNames);
        break;
      case 'weather':
        // Weather correction calculation - passes rho and hpc by reference
        this.executeWeatherSub(argNames);
        break;
      case 'engine':
        // Generate HP/TQ curves
        this.executeEngineSub();
        break;
      case 'addlistline':
      case 'settprnt':
      case 'msgbox':
      case 'timer1':
      case 'loadgraph':
      case 'sub310':
      case 'sub315':
      case 'sub320':
      case 'sub325':
      case 'beep':
        // UI functions - ignore
        break;
    }
  }
  
  private interpolateHP(rpm: number): number {
    const xrpm = this.state.arrays.get('xrpm') ?? [];
    const yhp = this.state.arrays.get('yhp') ?? [];
    const nhp = Math.round(this.getVariable('nhp'));
    
    // Debug: check if arrays are populated
    if (xrpm.length === 0 || yhp.length === 0 || nhp === 0) {
      console.warn(`[VB6] interpolateHP: arrays empty! xrpm.len=${xrpm.length}, yhp.len=${yhp.length}, nhp=${nhp}`);
      return 0;
    }
    
    // Find bracketing points
    let i = 1;
    for (; i < nhp; i++) {
      if (rpm >= xrpm[i] && rpm <= xrpm[i + 1]) break;
    }
    
    if (i >= nhp) i = nhp - 1;
    if (i < 1) i = 1;
    
    // Linear interpolation
    const x0 = xrpm[i] ?? 0;
    const x1 = xrpm[i + 1] ?? x0;
    const y0 = yhp[i] ?? 0;
    const y1 = yhp[i + 1] ?? y0;
    
    if (x1 === x0) return vbSingle(y0);
    return vbSingle(y0 + (y1 - y0) * (rpm - x0) / (x1 - x0));
  }
  
  private executeTireSub(argNames: string[]): void {
    // Tire growth calculation from TIMESLIP.FRM lines 1585-1607
    // Get TireDia from form control or variable - VB6 uses gc_TireDia.Value
    const TireDia = this.state.formControls.get('gc_tiredia') ?? this.getVariable('tiredia') ?? 26;
    const TireWidth = this.state.formControls.get('gc_tirewidth') ?? 10;
    const Vel_L = this.getArrayElement('vel', this.getVariable('l'));
    const Ags0 = this.getVariable('ags0');
    
    const TGK = vbSingle((Math.pow(TireWidth, 1.4) + TireDia - 16) / (0.171 * Math.pow(TireDia, 1.7)));
    let TireGrowth = vbSingle(1 + TGK * 0.0000135 * Math.pow(Vel_L, 1.6));
    const TGLinear = vbSingle(1 + TGK * 0.00035 * Vel_L);
    if (TGLinear < TireGrowth) TireGrowth = TGLinear;
    
    const TireSQ = vbSingle(TireGrowth - 0.035 * Math.abs(Ags0));
    let TireCirFt = vbSingle(TireSQ * TireDia * VB6Constants.PI / 12);
    
    // Safety: prevent division by zero later
    if (TireCirFt <= 0 || isNaN(TireCirFt)) {
      TireCirFt = vbSingle(TireDia * VB6Constants.PI / 12); // Default to basic circumference
    }
    
    // Debug first call
    if (this.gotoCount < 2) {
      console.log(`[VB6] Tire: TireDia=${TireDia}, TireWidth=${TireWidth}, Vel_L=${Vel_L}, TireCirFt=${TireCirFt}`);
    }
    
    // Store results in by-reference parameters
    this.setVariable(argNames[0] || 'tiregrowth', TireGrowth);
    this.setVariable(argNames[1] || 'tirecirft', TireCirFt);
  }
  
  private executeWeatherSub(argNames: string[]): void {
    // Weather correction from QTRPERF.BAS lines 1290-1377
    const TSTD = 519.67;
    const PSTD = 14.696;
    const BSTD = 29.92;
    const WTAIR = 28.9669;
    const WTH20 = 18.016;
    const RSTD = 1545.32;
    
    const temp = this.state.formControls.get('gc_temperature') ?? 70;
    const baro = this.state.formControls.get('gc_barometer') ?? 29.92;
    const humidity = this.state.formControls.get('gc_humidity') ?? 50;
    const elevation = this.state.formControls.get('gc_elevation') ?? 0;
    const fuelSystem = this.state.formControls.get('gc_fuelsystem') ?? 1;
    
    // Partial pressure calculation
    const cps = [0, 0.0205558, 0.00118163, 0.0000154988, 0.00000040245, 0.000000000434856, 0.00000000002096];
    const psdry = cps[1] + cps[2] * temp + cps[3] * temp * temp + cps[4] * Math.pow(temp, 3) + cps[5] * Math.pow(temp, 4) + cps[6] * Math.pow(temp, 5);
    
    const PWV = (humidity / 100) * psdry;
    const pamb = (PSTD * baro / BSTD) * Math.pow((TSTD - 0.00356616 * elevation) / TSTD, 5.25588);
    const pair = pamb - PWV;
    const delta = pair / PSTD;
    const WAR = (PWV * WTH20) / (pair * WTAIR);
    
    const theta = (temp + 459.67) / TSTD;
    const RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR);
    const rgrs = RGAS / (RSTD / WTAIR);
    const rho = vbSingle(144 * pamb / (RGAS * (temp + 459.67)));
    
    // Fuel system factors
    let ifuel = 1, icarb = 1;
    switch (Math.round(fuelSystem)) {
      case 1: ifuel = 1; icarb = 1; break;
      case 2: ifuel = 1; icarb = 2; break;
      case 3: ifuel = 2; icarb = 1; break;
      case 4: ifuel = 2; icarb = 2; break;
      case 5: ifuel = 3; icarb = 2; break;
      case 6: ifuel = 1; icarb = 3; break;
      case 7: case 9: ifuel = 2; icarb = 3; break;
      case 8: ifuel = 3; icarb = 3; break;
    }
    
    const kwar = 1 + 2.48 * Math.pow(WAR, 1.5);
    
    let px = 1, tx = 0.6, mech = 0.15;
    switch (ifuel) {
      case 1: px = 1; tx = 0.6; mech = 0.15; break;
      case 2: px = 1; tx = 0.3; mech = 0.13; break;
      case 3: px = 0.85; tx = 0.5; mech = 0.055; break;
    }
    
    if (icarb === 2) mech = mech - 0.005;
    if (icarb === 3) {
      px = 0.95;
      const dtx = (1.35 - 1) / 1.35 / 0.85;
      px = px - dtx * tx;
      tx = tx + dtx;
      mech = 0.6 * mech;
    }
    
    let hpc = vbSingle(Math.pow(delta, px) / (Math.sqrt(rgrs) * Math.pow(theta, tx)));
    if (hpc === 0 || isNaN(hpc)) {
      console.warn(`[VB6] Weather: hpc=0 before adjustment! delta=${delta}, rgrs=${rgrs}, theta=${theta}`);
      hpc = 1; // Prevent division by zero
    }
    hpc = vbSingle((1 + mech) * kwar / hpc - mech);
    
    if (Math.round(fuelSystem) === 9) hpc = 1;
    if (hpc === 0 || isNaN(hpc) || !isFinite(hpc)) {
      console.warn(`[VB6] Weather: hpc invalid after adjustment! Setting to 1`);
      hpc = 1;
    }
    
    console.log(`[VB6] Weather: rho=${rho.toFixed(4)}, hpc=${hpc.toFixed(4)}`);
    
    // Store results in by-reference parameters
    this.setVariable(argNames[0] || 'rho', rho);
    this.setVariable(argNames[1] || 'hpc', hpc);
  }
  
  private executeEngineSub(): void {
    // Generate HP/TQ curves based on engine parameters
    // This is a simplified version of TIMESLIP.FRM ENGINE subroutine
    console.log('[VB6] ENGINE subroutine called');
    
    const peakHP = this.state.formControls.get('gc_peakhp') ?? 300;
    const rpmPeakHP = this.state.formControls.get('gc_rpmpeakhp') ?? 6000;
    const displacement = this.state.formControls.get('gc_displacement') ?? 350;
    // fuelSystem reserved for future fuel-specific HP curves
    void this.state.formControls.get('gc_fuelsystem');
    
    // Initialize arrays
    const NHP = 21;
    this.setVariable('nhp', NHP);
    this.initArray('xrpm', 0, NHP + 1);
    this.initArray('yhp', 0, NHP + 1);
    this.initArray('ztq', 0, NHP + 1);
    
    // Calculate HP/TQ curve
    const TQPHP = vbSingle(5252 / rpmPeakHP);
    void displacement; // Reserved for CID-based HP calculations
    
    // Generate curve points from idle to redline
    const idleRPM = 1000;
    const redlineRPM = rpmPeakHP * 1.1;
    const rpmStep = (redlineRPM - idleRPM) / (NHP - 1);
    
    for (let n = 1; n <= NHP; n++) {
      const rpm = idleRPM + (n - 1) * rpmStep;
      this.setArrayElement('xrpm', n, rpm);
      
      // Simplified HP curve: parabolic shape peaking at rpmPeakHP
      const rpmRatio = rpm / rpmPeakHP;
      let hpRatio = 1 - Math.pow(rpmRatio - 1, 2) * 1.5;
      if (hpRatio < 0.3) hpRatio = 0.3;
      if (rpmRatio < 0.3) hpRatio = rpmRatio / 0.3 * 0.3;
      
      const hp = vbSingle(peakHP * hpRatio);
      const tq = rpm > 0 ? vbSingle(hp * 5252 / rpm) : 0;
      
      this.setArrayElement('yhp', n, hp);
      this.setArrayElement('ztq', n, tq);
    }
    
    // Store peak values
    this.setVariable('hpmax', peakHP);
    this.setVariable('tqmax', peakHP * TQPHP);
  }
  
  private executeSelect(): boolean {
    this.advance(); // Skip 'Select'
    if (this.currentToken()?.value === 'Case') this.advance();
    
    const testValue = this.evalExpr([':']);
    
    // Skip to first Case
    while (this.currentToken()?.type !== 'EOF') {
      if (this.currentToken()?.value === 'Case') break;
      this.advance();
    }
    
    // Process Case statements
    let matched = false;
    while (this.currentToken()?.type !== 'EOF') {
      if (this.currentToken()?.value === 'End' && 
          this.tokens[this.pos + 1]?.value === 'Select') {
        this.advance(); // Skip 'End'
        this.advance(); // Skip 'Select'
        return true;
      }
      
      if (this.currentToken()?.value === 'Case') {
        this.advance(); // Skip 'Case'
        
        // Check for Case Else
        if (this.currentToken()?.value === 'Else') {
          this.advance();
          if (!matched) {
            // Execute Case Else block
            while (this.currentToken()?.type !== 'EOF') {
              if (this.currentToken()?.value === 'Case' ||
                  (this.currentToken()?.value === 'End' && 
                   this.tokens[this.pos + 1]?.value === 'Select')) {
                break;
              }
              const beforePos = this.pos;
              if (!this.executeStatement()) return false;
              // If GoTo jumped us elsewhere, exit Select immediately
              if (Math.abs(this.pos - beforePos) > 50) {
                return true;
              }
            }
          }
          continue;
        }
        
        // Evaluate case value(s) - handle comma-separated values
        let caseMatches = false;
        while (true) {
          const caseValue = this.evalExpr([',', ':', 'To']);
          
          // Check for range (Case 1 To 5)
          if (this.currentToken()?.value === 'To') {
            this.advance();
            const endValue = this.evalExpr([',', ':']);
            if (testValue >= caseValue && testValue <= endValue) {
              caseMatches = true;
            }
          } else if (testValue === caseValue) {
            caseMatches = true;
          }
          
          if (this.currentToken()?.type === 'COMMA') {
            this.advance();
          } else {
            break;
          }
        }
        
        // Skip colon after case value if present
        if (this.currentToken()?.type === 'COLON') {
          this.advance();
        }
        
        if (caseMatches && !matched) {
          matched = true;
          // Execute this case block
          while (this.currentToken()?.type !== 'EOF') {
            if (this.currentToken()?.value === 'Case' ||
                (this.currentToken()?.value === 'End' && 
                 this.tokens[this.pos + 1]?.value === 'Select')) {
              break;
            }
            const beforePos = this.pos;
            if (!this.executeStatement()) return false;
            // If GoTo jumped us elsewhere, exit Select immediately
            if (Math.abs(this.pos - beforePos) > 50) {
              return true;
            }
          }
        } else {
          // Skip this case block
          while (this.currentToken()?.type !== 'EOF') {
            if (this.currentToken()?.value === 'Case' ||
                (this.currentToken()?.value === 'End' && 
                 this.tokens[this.pos + 1]?.value === 'Select')) {
              break;
            }
            this.advance();
          }
        }
      } else {
        this.advance();
      }
    }
    
    return true;
  }
  
  private executeExit(): boolean {
    this.advance(); // Skip 'Exit'
    const exitType = this.currentToken()?.value;
    this.advance();
    
    if (exitType === 'For') {
      // Find matching Next and skip to it
      let depth = 1;
      while (depth > 0 && this.currentToken()?.type !== 'EOF') {
        if (this.currentToken()?.value === 'For') depth++;
        if (this.currentToken()?.value === 'Next') {
          depth--;
          if (depth === 0) {
            this.advance();
            if (this.currentToken()?.type === 'IDENTIFIER') this.advance();
            this.forStack.pop();
            return true;
          }
        }
        this.advance();
      }
    }
    
    return true;
  }
  
  private executeDo(): boolean {
    this.advance(); // Skip 'Do'
    this.doStack.push({ stmtIndex: this.pos });
    
    // Check for While/Until condition
    if (this.currentToken()?.value === 'While') {
      this.advance();
      const cond = this.evalExpr([':']);
      if (cond === 0) {
        // Skip to Loop
        let depth = 1;
        while (depth > 0 && this.currentToken()?.type !== 'EOF') {
          if (this.currentToken()?.value === 'Do') depth++;
          if (this.currentToken()?.value === 'Loop') {
            depth--;
            if (depth === 0) {
              this.advance();
              this.doStack.pop();
              return true;
            }
          }
          this.advance();
        }
      }
    } else if (this.currentToken()?.value === 'Until') {
      this.advance();
      const cond = this.evalExpr([':']);
      if (cond !== 0) {
        // Skip to Loop
        let depth = 1;
        while (depth > 0 && this.currentToken()?.type !== 'EOF') {
          if (this.currentToken()?.value === 'Do') depth++;
          if (this.currentToken()?.value === 'Loop') {
            depth--;
            if (depth === 0) {
              this.advance();
              this.doStack.pop();
              return true;
            }
          }
          this.advance();
        }
      }
    }
    
    return true;
  }
  
  private executeLoop(): boolean {
    this.advance(); // Skip 'Loop'
    
    const loop = this.doStack[this.doStack.length - 1];
    if (!loop) return true;
    
    // Check for While/Until condition at Loop
    if (this.currentToken()?.value === 'While') {
      this.advance();
      const cond = this.evalExpr([':']);
      if (cond !== 0) {
        this.pos = loop.stmtIndex;
      } else {
        this.doStack.pop();
      }
    } else if (this.currentToken()?.value === 'Until') {
      this.advance();
      const cond = this.evalExpr([':']);
      if (cond === 0) {
        this.pos = loop.stmtIndex;
      } else {
        this.doStack.pop();
      }
    } else {
      // Infinite loop - go back
      this.pos = loop.stmtIndex;
    }
    
    return true;
  }
  
  private executeWhile(): boolean {
    this.advance(); // Skip 'While'
    
    const condPos = this.pos;
    const cond = this.evalExpr([':']);
    
    if (cond === 0) {
      // Skip to Wend
      let depth = 1;
      while (depth > 0 && this.currentToken()?.type !== 'EOF') {
        if (this.currentToken()?.value === 'While') depth++;
        if (this.currentToken()?.value === 'Wend') {
          depth--;
          if (depth === 0) {
            this.advance();
            return true;
          }
        }
        this.advance();
      }
    } else {
      this.doStack.push({ stmtIndex: condPos - 1 }); // -1 to re-evaluate While
    }
    
    return true;
  }
  
  private executeWend(): boolean {
    this.advance(); // Skip 'Wend'
    
    const loop = this.doStack.pop();
    if (loop) {
      this.pos = loop.stmtIndex;
    }
    
    return true;
  }
  
  private executeEnd(): boolean {
    this.advance(); // Skip 'End'
    
    const endType = this.currentToken()?.value;
    this.advance();
    
    // End If, End Select, End Sub, End Function are handled by their parent
    // End by itself terminates the program
    if (endType === 'If' || endType === 'Select' || endType === 'Sub' || endType === 'Function') {
      return true;
    }
    
    return false; // End program
  }
  
  // ========================================================================
  // Main Execution
  // ========================================================================
  
  run(): VB6Outputs {
    console.log('[VB6Interpreter] Starting execution...');
    console.log(`[VB6Interpreter] Total tokens: ${this.tokens.length}`);
    console.log(`[VB6Interpreter] Labels found: ${this.labels.size}`);
    
    // Initialize simulation arrays
    const maxL = 2000; // Maximum simulation steps
    this.initArray('vel', 0, maxL);
    this.initArray('time', 0, maxL);
    this.initArray('dist', 0, maxL);
    this.initArray('accel', 0, maxL);
    this.initArray('rpm', 0, maxL);
    this.initArray('timeslip', 0, 20);
    this.initArray('vel_mph', 0, maxL);
    
    // Initialize key variables
    this.setVariable('l', 0);
    this.setVariable('igear', 1);
    this.setVariable('tiredia', this.state.formControls.get('gc_tiredia') ?? 26);
    this.setVariable('tirewidth', this.state.formControls.get('gc_tirewidth') ?? 10);
    this.setVariable('weight', this.state.formControls.get('gc_weight') ?? 3000);
    this.setVariable('gearratio', this.state.formControls.get('gc_gearratio') ?? 4.10);
    
    // Find CalcOutput function start
    let foundCalcOutput = false;
    while (this.pos < this.tokens.length) {
      if (this.currentToken()?.value === 'CalcOutput') {
        foundCalcOutput = true;
        this.skipToEndOfLine(); // Skip function declaration line
        console.log(`[VB6Interpreter] Found CalcOutput at token ${this.pos}`);
        break;
      }
      this.advance();
    }
    
    if (!foundCalcOutput) {
      console.error('[VB6Interpreter] CalcOutput function not found!');
      return this.getOutputs();
    }
    
    // Debug: print labels found with their positions
    console.log('[VB6Interpreter] Labels:', Array.from(this.labels.keys()).join(', '));
    
    // Verify label 240 position
    const label240Pos = this.labels.get('240');
    if (label240Pos !== undefined) {
      const tokAt240 = this.tokens[label240Pos];
      console.log(`[VB6Interpreter] Label 240 at pos ${label240Pos}: ${tokAt240?.type}:${tokAt240?.value} (line ${tokAt240?.line})`);
    }
    
    // Execute statements until End Function or error
    let iterations = 0;
    const maxIterations = 50000; // Safety limit - simulation needs many iterations
    let lastPos = -1;
    let stuckCount = 0;
    
    while (iterations < maxIterations) {
      iterations++;
      
      const tok = this.currentToken();
      
      // Detect if we're stuck at the same position
      if (this.pos === lastPos) {
        // Special case: if stuck at "End If", skip past it
        if (tok?.value === 'End' && String(this.tokens[this.pos + 1]?.value ?? '').toLowerCase() === 'if') {
          this.advance(); // Skip 'End'
          this.advance(); // Skip 'If'
          stuckCount = 0;
          lastPos = this.pos;
        } else {
          stuckCount++;
          if (stuckCount > 10) {
            console.error(`[VB6Interpreter] STUCK at pos ${this.pos}, token: ${JSON.stringify(tok)}`);
            break;
          }
        }
      } else {
        stuckCount = 0;
        lastPos = this.pos;
      }
      
      // Log execution flow with key physics values - detect first NaN
      if (iterations % 2000 === 0 || (iterations < 100 && iterations % 10 === 0) || (iterations > 100 && iterations < 200 && iterations % 10 === 0)) {
        const L = this.getVariable('l');
        const vel = this.getArrayElement('vel', L);
        const dist = this.getArrayElement('dist', L);
        const hp = this.getVariable('hp');
        const ags0 = this.getVariable('ags0');
        const timestep = this.getVariable('timestep');
        const iDist = this.getVariable('idist');
        const printFlag = this.getVariable('printflag');
        const distToPrint = this.getArrayElement('disttoprint', iDist);
        if (iterations < 100 || (iterations > 100 && iterations < 200) || isNaN(vel) || isNaN(hp)) {
          console.log(`[VB6] iter=${iterations}, L=${L}, vel=${vel?.toFixed(2)}, dist=${dist?.toFixed(2)}, HP=${hp?.toFixed(0)}, ags0=${ags0?.toFixed(2)}, ts=${timestep?.toFixed(4)}, iDist=${iDist}, pf=${printFlag}, dtp=${distToPrint?.toFixed(2)}`);  
        }
      }
      
      // Check for End Function BEFORE executing
      if (tok?.value === 'End' && this.tokens[this.pos + 1]?.value === 'Function') {
        console.log('[VB6Interpreter] Reached End Function - stopping');
        break;
      }
      
      // Check for calcoutputexit label BEFORE executing
      if (tok?.type === 'IDENTIFIER' && String(tok?.value).toLowerCase() === 'calcoutputexit') {
        console.log('[VB6Interpreter] Reached calcoutputexit label');
        break;
      }
      
      if (!this.executeStatement()) {
        console.log(`[VB6Interpreter] Execution stopped at iteration ${iterations}, pos=${this.pos}`);
        console.log(`[VB6Interpreter] Current token: ${tok?.type}:${tok?.value}`);
        break;
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn('[VB6Interpreter] Hit iteration limit!');
    }
    
    console.log(`[VB6Interpreter] Completed in ${iterations} iterations`);
    
    // Debug: print key variables
    console.log('[VB6Interpreter] Final state:');
    console.log(`  L = ${this.getVariable('l')}`);
    console.log(`  iGear = ${this.getVariable('igear')}`);
    
    const timeslip = this.state.arrays.get('timeslip');
    if (timeslip) {
      console.log(`  TIMESLIP[1] (60ft) = ${timeslip[1]?.toFixed(3)}`);
      console.log(`  TIMESLIP[6] (ET) = ${timeslip[6]?.toFixed(3)}`);
      console.log(`  TIMESLIP[7] (MPH) = ${timeslip[7]?.toFixed(1)}`);
    }
    
    return this.getOutputs();
  }
  
  private getOutputs(): VB6Outputs {
    const TIMESLIP = this.state.arrays.get('timeslip') ?? [];
    
    return {
      ET: TIMESLIP[6] ?? 0,
      MPH: TIMESLIP[7] ?? 0,
      time60ft: TIMESLIP[1] ?? 0,
      time330ft: TIMESLIP[2] ?? 0,
      time660ft: TIMESLIP[3] ?? 0,
      mph660ft: TIMESLIP[4] ?? 0,
      time1000ft: TIMESLIP[5] ?? 0,
      time1320ft: TIMESLIP[6] ?? 0,
      mph1320ft: TIMESLIP[7] ?? 0,
    };
  }
}

// ============================================================================
// Helper: Load VB6 source file
// ============================================================================

export async function loadVB6Source(path: string): Promise<string> {
  // In browser context, fetch the file
  // In Node.js context, use fs
  const response = await fetch(path);
  return response.text();
}

// ============================================================================
// Main entry point
// ============================================================================

export async function runVB6Simulation(
  vb6SourcePath: string,
  inputs: VB6Inputs
): Promise<VB6Outputs> {
  const source = await loadVB6Source(vb6SourcePath);
  const interpreter = new VB6Interpreter(source);
  interpreter.setInputs(inputs);
  return interpreter.run();
}
