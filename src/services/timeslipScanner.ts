/**
 * Time Slip Scanner Service
 * 
 * Uses OCR to extract timing data from photographed time slips.
 * Supports both LEFT and RIGHT lane extraction including opponent data.
 * 
 * Supported time slip formats:
 * - Compulink: LABEL ... leftValue    rightValue (dots separator)
 * - Accutime II: leftValue ----- LABEL ----- rightValue (dashes, label in center)
 * - Standard: LEFT/RIGHT columns with labeled rows
 */

import Tesseract from 'tesseract.js';

export interface TimeslipLaneData {
  carNumber?: string;
  teamName?: string;
  class?: string;
  dialIn?: number;
  reactionTime?: number;
  sixtyFt?: number;
  threeThirtyFt?: number;
  eighthMileET?: number;
  eighthMileMPH?: number;
  thousandFt?: number;
  quarterMileET?: number;
  quarterMileMPH?: number;
  overUnder?: number;
  finishMargin?: number;
  offDial?: number;
}

export interface TimeslipData {
  trackName?: string;
  date?: string;
  time?: string;
  round?: string;
  runNumber?: number;
  left: TimeslipLaneData;
  right: TimeslipLaneData;
  winner?: 'left' | 'right' | 'bye';
  margin?: number;
  rawText: string;
  confidence: number;
  format?: 'compulink' | 'accutime' | 'unknown';
}

export type LaneSelection = 'left' | 'right';

/**
 * Parse a numeric value from text, handling common OCR errors
 * @param text - raw OCR text
 * @param expectNegative - if true, small decimals like .007 should be negative (for R/T)
 */
function parseNumber(text: string | undefined, expectNegative: boolean = false): number | undefined {
  if (!text) return undefined;
  
  let input = text.trim();
  
  // Handle "L007" -> ".007" (L mistaken for decimal point, common for R/T)
  if (/^L\d/i.test(input)) {
    input = '.' + input.substring(1);
  }
  
  // Handle "01%" -> ".015" (0 at start is decimal, % is 5)
  // Match patterns like "01%", "015", "0l5" etc
  if (/^0[1lI]\d*[%5]?$/i.test(input)) {
    input = '.' + input.substring(1);
  }
  
  // Clean up common OCR mistakes
  let cleaned = input
    .replace(/[oO]/g, '0')  // O -> 0
    .replace(/[lI|]/g, '1')  // l/I/| -> 1
    .replace(/[qQ]/g, '5')  // q/Q -> 5 (q.1177 -> 5.1177)
    .replace(/[sS]/g, '5')  // S -> 5
    .replace(/[%]/g, '5')   // % -> 5 (1.36% should be 1.365)
    .replace(/[,]/g, '.')   // comma -> decimal
    .replace(/\s+/g, '')    // Remove spaces
    .replace(/[^0-9.\-]/g, ''); // Remove non-numeric except minus and dot
  
  // Handle case where minus got separated  
  if (cleaned.startsWith('.') && text.trim().startsWith('-')) {
    cleaned = '-' + cleaned;
  }
  
  // If we have something like "007" from L007, ensure it's ".007"
  if (/^0{1,2}\d$/.test(cleaned) && cleaned.length <= 3) {
    cleaned = '.' + cleaned;
  }
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;
  
  // For R/T values, small positive decimals are likely negative
  if (expectNegative && num > 0 && num < 1) {
    return -num;
  }
  
  return num;
}

/**
 * Detect the time slip format based on text patterns
 */
function detectFormat(text: string): 'compulink' | 'accutime' | 'unknown' {
  // Accutime has centered labels with dashes: "value ----- LABEL ----- value"
  if (/\d+[\s.]*-{2,}.*-{2,}[\s.]*\d+/i.test(text) || 
      /ACCUTIME/i.test(text) ||
      /-{2,}\s*(DIAL|REACTION|60\s*FT|330\s*FT|1\/8)/i.test(text)) {
    return 'accutime';
  }
  
  // Compulink uses dots: "LABEL ... value value"
  if (/\.\.\./i.test(text) || /Compulink/i.test(text)) {
    return 'compulink';
  }
  
  return 'unknown';
}

/**
 * Parse Accutime format: "leftValue ----- LABEL ----- rightValue"
 */
function parseAccutimeFormat(lines: string[]): { left: TimeslipLaneData; right: TimeslipLaneData } {
  const left: TimeslipLaneData = {};
  const right: TimeslipLaneData = {};
  
  console.log('=== ACCUTIME PARSER ===');
  for (const line of lines) {
    if (!/-{2,}/.test(line)) continue;
    console.log('Dash line:', line);
    const parts = line.split(/-{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    console.log('Parts:', parts);
    if (parts.length < 2) continue;
    
    let leftVal: string | undefined, label: string | undefined, rightVal: string | undefined;
    if (parts.length >= 3) { leftVal = parts[0]; label = parts[1]; rightVal = parts[2]; }
    else if (/^[\d.\-]+$/.test(parts[0].replace(/\s/g, ''))) { leftVal = parts[0]; label = parts[1]; }
    else { label = parts[0]; rightVal = parts[1]; }
    
    console.log('Parsed:', { leftVal, label, rightVal });
    if (!label) continue;
    const L = label.toUpperCase();
    
    if (/DIAL\s*IN/i.test(L)) { left.dialIn = parseNumber(leftVal); right.dialIn = parseNumber(rightVal); }
    else if (/REACTION/i.test(L)) { left.reactionTime = parseNumber(leftVal); right.reactionTime = parseNumber(rightVal); }
    else if (/60\s*F/i.test(L)) { left.sixtyFt = parseNumber(leftVal); right.sixtyFt = parseNumber(rightVal); }
    else if (/330\s*F/i.test(L)) { left.threeThirtyFt = parseNumber(leftVal); right.threeThirtyFt = parseNumber(rightVal); }
    else if (/1\/8\s*ET/i.test(L)) { left.eighthMileET = parseNumber(leftVal); right.eighthMileET = parseNumber(rightVal); }
    else if (/1\/8\s*MPH/i.test(L)) { left.eighthMileMPH = parseNumber(leftVal); right.eighthMileMPH = parseNumber(rightVal); }
    else if (/FINISH\s*MARGIN/i.test(L)) { left.finishMargin = parseNumber(leftVal); right.finishMargin = parseNumber(rightVal); }
    else if (/OFF\s*DIAL/i.test(L)) { left.offDial = parseNumber(leftVal); right.offDial = parseNumber(rightVal); }
  }
  console.log('Accutime result:', { left, right });
  return { left, right };
}

/**
 * Pre-clean a line by fixing common OCR character substitutions
 */
function cleanOcrLine(line: string): string {
  return line
    // Fix label errors first
    .replace(/^BO["']/i, "60'")        // BO" -> 60'
    .replace(/^\$30\.?0?\.?/i, '330')  // $30.0. -> 330
    .replace(/^RAT\s+/i, 'R/T ')       // RAT ool -> R/T
    // Fix number errors - be careful with context
    .replace(/([,\s])L(\d{2,3})/g, '$1.$2')  // L007 -> .007 (L as decimal point)
    .replace(/(\s)0(\d)%/g, '$1.0$25')  // 01% -> .015 (0 is decimal, % is 5)
    .replace(/(\d)%/g, '$15')          // 1.36% -> 1.365
    .replace(/[qQ]\.(\d+)/g, '5.$1')   // q.1177 -> 5.1177
    .replace(/(\d)\.(\d+)[lI](\d+)/g, '$1.$2$3'); // 5.11l7 -> 5.1177
}

/**
 * Parse Compulink format: "LABEL ... leftValue    rightValue"
 */
function parseCompulinkFormat(lines: string[]): { left: TimeslipLaneData; right: TimeslipLaneData } {
  const left: TimeslipLaneData = {};
  const right: TimeslipLaneData = {};
  let mphCount = 0;
  
  console.log('=== COMPULINK PARSER ===');
  for (const rawLine of lines) {
    // Pre-clean the line to fix OCR errors
    const line = cleanOcrLine(rawLine);
    
    // Extract all decimal numbers from cleaned line
    const numbers = line.match(/-?\d+\.\d+|-?\.\d+/g) || [];
    
    // Identify the label from start of line (include digits for 60', 330, 1/8)
    const labelMatch = line.match(/^([A-Za-z0-9\/\s']+?)(?:\.{2,}|\s{2,}|\s+\d)/);
    const label = labelMatch ? labelMatch[1].trim().toUpperCase() : '';
    
    // Also check the raw line for numeric labels that might be mangled
    const lineStart = line.substring(0, 10).toUpperCase();
    
    if (numbers.length > 0) {
      console.log('Raw:', rawLine);
      console.log('Clean:', line, '| Label:', label, '| Numbers:', numbers);
    }
    if (numbers.length === 0) continue;
    
    // Take last two numbers as left/right values
    const leftVal = numbers.length >= 2 ? numbers[numbers.length - 2] : numbers[0];
    const rightVal = numbers.length >= 2 ? numbers[numbers.length - 1] : undefined;
    
    // Parse values
    if (!leftVal) continue;
    const leftNum = parseFloat(leftVal);
    const rightNum = rightVal ? parseFloat(rightVal) : undefined;
    
    // Match labels to fields (check both extracted label AND line start)
    if (/DIAL/i.test(label)) { 
      left.dialIn = leftNum; right.dialIn = rightNum; 
    }
    else if (/R\/T/i.test(label) || /^RT$/i.test(label) || /^R\/T/i.test(lineStart)) { 
      // R/T values are typically negative
      left.reactionTime = leftNum > 0 && leftNum < 1 ? -leftNum : leftNum;
      right.reactionTime = rightNum !== undefined && rightNum > 0 && rightNum < 1 ? -rightNum : rightNum;
    }
    else if (/^60/i.test(label) || /^60['']?/i.test(lineStart)) { 
      left.sixtyFt = leftNum; right.sixtyFt = rightNum; 
    }
    else if (/^330/i.test(label) || /^330/i.test(lineStart)) { 
      left.threeThirtyFt = leftNum; right.threeThirtyFt = rightNum; 
    }
    else if (/^1\/8/i.test(label) || /^1\/8/i.test(lineStart)) { 
      left.eighthMileET = leftNum; right.eighthMileET = rightNum; 
    }
    else if (/MPH/i.test(label) || /^MPH/i.test(lineStart)) {
      if (mphCount === 0) { left.eighthMileMPH = leftNum; right.eighthMileMPH = rightNum; }
      else { left.quarterMileMPH = leftNum; right.quarterMileMPH = rightNum; }
      mphCount++;
    }
    else if (/^1000/i.test(label) || /^1000/i.test(lineStart)) { 
      left.thousandFt = leftNum; right.thousandFt = rightNum; 
    }
    else if (/^E\.?T/i.test(label)) { 
      left.quarterMileET = leftNum; right.quarterMileET = rightNum; 
    }
  }
  console.log('Compulink result:', { left, right });
  return { left, right };
}

/**
 * Extract time slip data from raw OCR text
 */
function parseTimeslipText(text: string): TimeslipData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = lines.join(' ');
  const format = detectFormat(text);
  
  // Debug: Log raw OCR output
  console.log('=== TIME SLIP OCR RAW TEXT ===');
  console.log(text);
  console.log('=== DETECTED FORMAT:', format, '===');
  console.log('=== LINES:', lines);
  
  const result: TimeslipData = { left: {}, right: {}, rawText: text, confidence: 0, format };
  
  // Extract track name
  const trackLine = lines.find(l => /Motorsports|Dragway|Raceway|NHRA|Park|Valley|Speedway/i.test(l));
  if (trackLine) result.trackName = trackLine.replace(/[*]+/g, '').trim();
  
  // Extract date/time
  const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) result.date = dateMatch[1];
  const timeMatch = fullText.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (timeMatch) result.time = timeMatch[1];
  
  // Round/run info
  const roundMatch = fullText.match(/(?:ELIM\s*)?(?:RD#?|Round)\s*:?\s*(\d+)/i);
  if (roundMatch) result.round = roundMatch[1];
  const runMatch = fullText.match(/RUN\s*:?\s*(\d+)/i);
  if (runMatch) result.runNumber = parseInt(runMatch[1]);
  
  // Car numbers "LEFT:2 ... RIGHT:162"
  const laneMatch = fullText.match(/LEFT\s*:?\s*(\d+).*RIGHT\s*:?\s*(\d+)/i);
  if (laneMatch) { result.left.carNumber = laneMatch[1]; result.right.carNumber = laneMatch[2]; }
  
  // Parse timing data based on format
  let timingData: { left: TimeslipLaneData; right: TimeslipLaneData };
  if (format === 'accutime') {
    timingData = parseAccutimeFormat(lines);
  } else if (format === 'compulink') {
    timingData = parseCompulinkFormat(lines);
  } else {
    // Try both, use the one with more data
    const accuData = parseAccutimeFormat(lines);
    const compuData = parseCompulinkFormat(lines);
    const accuCount = Object.values(accuData.left).filter(v => v !== undefined).length +
                      Object.values(accuData.right).filter(v => v !== undefined).length;
    const compuCount = Object.values(compuData.left).filter(v => v !== undefined).length +
                       Object.values(compuData.right).filter(v => v !== undefined).length;
    timingData = accuCount >= compuCount ? accuData : compuData;
  }
  result.left = { ...result.left, ...timingData.left };
  result.right = { ...result.right, ...timingData.right };
  
  // Determine winner
  if (/<<\s*WIN/i.test(fullText)) result.winner = 'left';
  else if (/WIN\s*>>/i.test(fullText)) result.winner = 'right';
  for (const line of lines) {
    if (/WINNER/i.test(line)) {
      const idx = line.toUpperCase().indexOf('WINNER');
      result.winner = idx > line.length / 2 ? 'right' : 'left';
    }
  }
  
  // RED LT means foul - other side wins
  for (const line of lines) {
    if (/RED\s*L/i.test(line)) {
      const idx = line.toUpperCase().indexOf('RED');
      result.winner = idx < line.length / 3 ? 'right' : 'left';
    }
  }
  
  // Margin from "Right 1st .0006"
  const marginMatch = fullText.match(/(?:Left|Right)\s*1st\s*([\d.]+)/i);
  if (marginMatch) {
    result.margin = parseNumber(marginMatch[1]);
    result.winner = /Left\s*1st/i.test(fullText) ? 'left' : 'right';
  }
  
  // MOV foul
  if (/Left\s*MOV\s*foul/i.test(fullText)) result.winner = 'right';
  if (/Right\s*MOV\s*foul/i.test(fullText)) result.winner = 'left';
  
  // BYE run
  if (/BYE/i.test(fullText)) result.winner = 'bye';
  
  // Calculate confidence
  let fieldsFound = 0;
  const checkFields = ['reactionTime', 'sixtyFt', 'threeThirtyFt', 'eighthMileET', 'eighthMileMPH'];
  for (const field of checkFields) {
    if (result.left[field as keyof TimeslipLaneData] !== undefined) fieldsFound++;
    if (result.right[field as keyof TimeslipLaneData] !== undefined) fieldsFound++;
  }
  result.confidence = Math.min(1, fieldsFound / 10);
  
  return result;
}

/**
 * Scan a time slip image and extract data
 */
export async function scanTimeslip(
  imageSource: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<TimeslipData> {
  try {
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        },
      }
    );
    
    const parsedData = parseTimeslipText(result.data.text);
    parsedData.confidence = Math.min(parsedData.confidence, result.data.confidence);
    
    return parsedData;
  } catch (error) {
    console.error('OCR failed:', error);
    throw new Error('Failed to scan time slip. Please try again or enter data manually.');
  }
}

/**
 * Get user's run data based on lane selection
 */
export function getUserData(data: TimeslipData, lane: LaneSelection): TimeslipLaneData {
  return lane === 'left' ? data.left : data.right;
}

/**
 * Get opponent's run data based on lane selection
 */
export function getOpponentData(data: TimeslipData, lane: LaneSelection): TimeslipLaneData {
  return lane === 'left' ? data.right : data.left;
}

/**
 * Determine if user won based on lane selection and winner info
 */
export function didUserWin(data: TimeslipData, userLane: LaneSelection): boolean | null {
  if (!data.winner) return null;
  if (data.winner === 'bye') return true;
  return data.winner === userLane;
}

/**
 * Preprocess image for better OCR results
 * Applies gentle contrast enhancement - not too aggressive for thermal paper
 */
export async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        resolve(file);
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find min/max for auto-levels (sample every 10th pixel for speed)
      let min = 255, max = 0;
      for (let i = 0; i < data.length; i += 40) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (gray < min) min = gray;
        if (gray > max) max = gray;
      }
      
      // Auto-levels: stretch contrast to use full range
      const range = max - min || 1;
      
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Stretch to full range (auto-levels)
        const stretched = Math.round(((gray - min) / range) * 255);
        
        // Gentle threshold - keep more mid-tones
        const enhanced = stretched < 100 ? 0 : (stretched > 200 ? 255 : stretched);
        
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(file);
        }
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
