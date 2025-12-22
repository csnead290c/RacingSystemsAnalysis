/**
 * Time Slip Scanner Service
 * 
 * Uses OCR to extract timing data from photographed time slips.
 * Supports both LEFT and RIGHT lane extraction including opponent data.
 * 
 * Common time slip formats:
 * - Standard format: LEFT ... RIGHT columns with Car #, Class, DIAL, R/T, 60', 330, 1/8, MPH, 1000, 1/4, MPH
 * - NHRA format: Entry/BYE columns, DIAL-IN, REACTION, 60 Foot, 330 Foot, etc.
 * - Compulink format: Similar with margin info at bottom
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
}

export type LaneSelection = 'left' | 'right';

/**
 * Parse a numeric value from text, handling common OCR errors
 */
function parseNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  
  // Clean up common OCR mistakes
  let cleaned = text
    .replace(/[oO]/g, '0')  // O -> 0
    .replace(/[lI]/g, '1')  // l/I -> 1
    .replace(/[sS]/g, '5')  // S -> 5 (sometimes)
    .replace(/[,]/g, '.')   // comma -> decimal
    .replace(/[^0-9.-]/g, ''); // Remove non-numeric
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Extract time slip data from raw OCR text
 */
function parseTimeslipText(text: string): TimeslipData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const result: TimeslipData = {
    left: {},
    right: {},
    rawText: text,
    confidence: 0,
  };
  
  // Common patterns for field extraction
  const patterns = {
    carNumber: /Car\s*#?\s*\.{0,3}\s*(\S+)\s+(\S+)/i,
    class: /Class\s*\.{0,3}\s*(\S*)\s*(\S*)/i,
    dialIn: /DIAL(?:-?IN)?\s*\.{0,3}\s*([\d.]+)?\s*([\d.]+)?/i,
    reactionTime: /R\/T|REACTION\s*\.{0,3}\s*([\d.]+)\s*([\d.]+)?/i,
    sixtyFt: /60['\s]?(?:Foot)?\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    threeThirty: /330['\s]?(?:Foot)?\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    eighthET: /1\/8(?:\s*ET)?\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    eighthMPH: /(?:1\/8\s*)?MPH\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    thousandFt: /1000['\s]?(?:Foot)?\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    quarterET: /(?:1\/4|E\.?T\.?)\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    quarterMPH: /(?:1\/4\s*)?MPH\s*\.{0,3}\s*-{0,3}\s*([\d.]+)\s*-{0,3}\s*([\d.]+)?/i,
    winner: /WINNER\s*<?=*>?\s*(LEFT|RIGHT|<<|>>|<=|=>)/i,
    round: /Round\s*:?\s*(\S+)/i,
    runNumber: /Run\s*:?\s*(\d+)/i,
    date: /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    time: /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i,
    overUnder: /Ov\/Un\s*\.{0,3}\s*([\d.-]+)?\s*([\d.-]+)?/i,
  };
  
  // Process each line looking for patterns
  const fullText = lines.join(' ');
  
  // Extract track name from first few lines
  if (lines.length > 0) {
    const trackLine = lines.find(l => 
      l.includes('Motorsports') || 
      l.includes('Dragway') || 
      l.includes('Raceway') ||
      l.includes('NHRA') ||
      l.includes('Park')
    );
    if (trackLine) {
      result.trackName = trackLine;
    }
  }
  
  // Extract date/time
  const dateMatch = fullText.match(patterns.date);
  if (dateMatch) result.date = dateMatch[1];
  
  const timeMatch = fullText.match(patterns.time);
  if (timeMatch) result.time = timeMatch[1];
  
  // Extract round/run info
  const roundMatch = fullText.match(patterns.round);
  if (roundMatch) result.round = roundMatch[1];
  
  const runMatch = fullText.match(patterns.runNumber);
  if (runMatch) result.runNumber = parseInt(runMatch[1]);
  
  // Extract car numbers
  const carMatch = fullText.match(patterns.carNumber);
  if (carMatch) {
    result.left.carNumber = carMatch[1];
    result.right.carNumber = carMatch[2];
  }
  
  // Extract class
  const classMatch = fullText.match(patterns.class);
  if (classMatch) {
    result.left.class = classMatch[1] || undefined;
    result.right.class = classMatch[2] || undefined;
  }
  
  // Extract timing data - look for each field
  // For two-lane format, first value is left, second is right
  
  // Dial-In
  const dialMatch = fullText.match(patterns.dialIn);
  if (dialMatch) {
    result.left.dialIn = parseNumber(dialMatch[1]);
    result.right.dialIn = parseNumber(dialMatch[2]);
  }
  
  // Reaction Time
  const rtMatch = fullText.match(patterns.reactionTime);
  if (rtMatch) {
    result.left.reactionTime = parseNumber(rtMatch[1]);
    result.right.reactionTime = parseNumber(rtMatch[2]);
  }
  
  // 60 Foot
  const sixtyMatch = fullText.match(patterns.sixtyFt);
  if (sixtyMatch) {
    result.left.sixtyFt = parseNumber(sixtyMatch[1]);
    result.right.sixtyFt = parseNumber(sixtyMatch[2]);
  }
  
  // 330 Foot
  const threeThirtyMatch = fullText.match(patterns.threeThirty);
  if (threeThirtyMatch) {
    result.left.threeThirtyFt = parseNumber(threeThirtyMatch[1]);
    result.right.threeThirtyFt = parseNumber(threeThirtyMatch[2]);
  }
  
  // Parse lines more carefully for the remaining fields
  // Look for lines that contain the timing values
  for (const line of lines) {
    // 1/8 ET (look for line with 1/8 that has ET values, not MPH)
    if (/1\/8/i.test(line) && !/MPH/i.test(line)) {
      const values = line.match(/([\d.]+)/g);
      if (values && values.length >= 1) {
        if (!result.left.eighthMileET) result.left.eighthMileET = parseNumber(values[0]);
        if (values.length >= 2 && !result.right.eighthMileET) result.right.eighthMileET = parseNumber(values[1]);
      }
    }
    
    // 1000 Foot
    if (/1000/i.test(line)) {
      const values = line.match(/([\d.]+)/g);
      if (values && values.length >= 1) {
        // Skip "1000" itself
        const filtered = values.filter(v => parseFloat(v) !== 1000);
        if (filtered.length >= 1 && !result.left.thousandFt) result.left.thousandFt = parseNumber(filtered[0]);
        if (filtered.length >= 2 && !result.right.thousandFt) result.right.thousandFt = parseNumber(filtered[1]);
      }
    }
    
    // 1/4 or E.T. line (final ET)
    if (/1\/4|^E\.?T\.?\s/i.test(line) && !/MPH/i.test(line)) {
      const values = line.match(/([\d.]+)/g);
      if (values && values.length >= 1) {
        // Filter out "4" from "1/4"
        const filtered = values.filter(v => parseFloat(v) > 1);
        if (filtered.length >= 1 && !result.left.quarterMileET) result.left.quarterMileET = parseNumber(filtered[0]);
        if (filtered.length >= 2 && !result.right.quarterMileET) result.right.quarterMileET = parseNumber(filtered[1]);
      }
    }
  }
  
  // Extract MPH values (usually the last MPH line is 1/4 MPH)
  const mphLines = lines.filter(l => /MPH/i.test(l));
  if (mphLines.length >= 1) {
    // First MPH line is usually 1/8 MPH
    const firstMphValues = mphLines[0].match(/([\d.]+)/g);
    if (firstMphValues && firstMphValues.length >= 1) {
      result.left.eighthMileMPH = parseNumber(firstMphValues[0]);
      if (firstMphValues.length >= 2) result.right.eighthMileMPH = parseNumber(firstMphValues[1]);
    }
  }
  if (mphLines.length >= 2) {
    // Last MPH line is usually 1/4 MPH
    const lastMphValues = mphLines[mphLines.length - 1].match(/([\d.]+)/g);
    if (lastMphValues && lastMphValues.length >= 1) {
      result.left.quarterMileMPH = parseNumber(lastMphValues[0]);
      if (lastMphValues.length >= 2) result.right.quarterMileMPH = parseNumber(lastMphValues[1]);
    }
  }
  
  // Extract winner
  const winnerMatch = fullText.match(patterns.winner);
  if (winnerMatch) {
    const winnerText = winnerMatch[1].toUpperCase();
    if (winnerText.includes('LEFT') || winnerText.includes('<<') || winnerText.includes('<=')) {
      result.winner = 'left';
    } else if (winnerText.includes('RIGHT') || winnerText.includes('>>') || winnerText.includes('=>')) {
      result.winner = 'right';
    }
  }
  
  // Check for BYE run
  if (/BYE/i.test(fullText)) {
    result.winner = 'bye';
  }
  
  // Extract margin from "Right 1st X.XXXX" or similar
  const marginMatch = fullText.match(/(?:Left|Right)\s*1st\s*([\d.]+)/i);
  if (marginMatch) {
    result.margin = parseNumber(marginMatch[1]);
    // Determine winner from margin line
    if (/Left\s*1st/i.test(fullText)) {
      result.winner = 'left';
    } else if (/Right\s*1st/i.test(fullText)) {
      result.winner = 'right';
    }
  }
  
  // Over/Under
  const overUnderMatch = fullText.match(patterns.overUnder);
  if (overUnderMatch) {
    result.left.overUnder = parseNumber(overUnderMatch[1]);
    result.right.overUnder = parseNumber(overUnderMatch[2]);
  }
  
  // Calculate confidence based on how many fields we extracted
  let fieldsFound = 0;
  const checkFields = ['reactionTime', 'sixtyFt', 'eighthMileET', 'quarterMileET', 'quarterMileMPH'];
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
 * Applies contrast enhancement and grayscale conversion
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
      
      // Convert to grayscale and enhance contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Contrast enhancement (threshold at 128, stretch to 0-255)
        const enhanced = gray > 128 ? 255 : (gray < 80 ? 0 : Math.round((gray - 80) * 255 / 48));
        
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
