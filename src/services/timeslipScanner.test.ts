import { describe, it, expect } from 'vitest';
import {
  parseTimeslipText,
  parseWeather,
  getUserData,
  getOpponentData,
} from './timeslipScanner';

/**
 * Representative OCR text reconstructed from the DER RED bracket-series phone
 * display screenshots. This is the "center label" layout:
 *     leftValue   LABEL   rightValue
 * The footer row carries temperature / humidity / density altitude.
 */
const SLIP_FULL = `10/03/2025 20:36:39
211 234 234
TEST & TUNE TTRL 1
0.00 DIALIN 0.00
0.506 R/T 0.340
2.199 60' 1.797
5.794 330' 5.099
8.752 1/8 E.T. 7.870
83.30 1/8 Mph 88.47
11.298 1000' 10.258
13.453 E.T. 12.283
104.85 Mph 111.55
1ST 1.336
MOV
Idx/Rec
Un/Ov
615 Run# 616
59.2°F 77% 391 ft`;

/** A slip where only the left lane (user) ran; right lane mostly blank. */
const SLIP_PARTIAL = `05/30/2026 00:47:15
149 149 689
DIALIN
.780 R/T .851
2.507 60' 4.520
6.563 330'
9.713 1/8 E.T.
78.90 1/8 Mph
12.412 1000'
14.689 E.T.
99.11 Mph
4.6188 1ST
480 Run# 0
70.5°F 56% 3007 ft`;

describe('parseTimeslipText — center-label (DER RED) format', () => {
  const data = parseTimeslipText(SLIP_FULL);

  it('parses date and time', () => {
    expect(data.date).toBe('10/03/2025');
    expect(data.time).toBe('20:36:39');
  });

  it('parses the left lane timing fields', () => {
    expect(data.left.dialIn).toBe(0);
    expect(data.left.reactionTime).toBeCloseTo(0.506, 3);
    expect(data.left.sixtyFt).toBeCloseTo(2.199, 3);
    expect(data.left.threeThirtyFt).toBeCloseTo(5.794, 3);
    expect(data.left.eighthMileET).toBeCloseTo(8.752, 3);
    expect(data.left.eighthMileMPH).toBeCloseTo(83.3, 2);
    expect(data.left.thousandFt).toBeCloseTo(11.298, 3);
    expect(data.left.quarterMileET).toBeCloseTo(13.453, 3);
    expect(data.left.quarterMileMPH).toBeCloseTo(104.85, 2);
  });

  it('parses the right lane timing fields', () => {
    expect(data.right.reactionTime).toBeCloseTo(0.34, 3);
    expect(data.right.sixtyFt).toBeCloseTo(1.797, 3);
    expect(data.right.threeThirtyFt).toBeCloseTo(5.099, 3);
    expect(data.right.eighthMileET).toBeCloseTo(7.87, 3);
    expect(data.right.eighthMileMPH).toBeCloseTo(88.47, 2);
    expect(data.right.thousandFt).toBeCloseTo(10.258, 3);
    expect(data.right.quarterMileET).toBeCloseTo(12.283, 3);
    expect(data.right.quarterMileMPH).toBeCloseTo(111.55, 2);
  });

  it('does NOT negate positive reaction times (bracket .5xx lights are positive)', () => {
    expect(data.left.reactionTime).toBeGreaterThan(0);
    expect(data.right.reactionTime).toBeGreaterThan(0);
  });

  it('keeps 1/8 and 1/4 ET/MPH distinct (precedence)', () => {
    expect(data.left.eighthMileET).not.toBe(data.left.quarterMileET);
    expect(data.left.eighthMileMPH).not.toBe(data.left.quarterMileMPH);
  });

  it('selects user vs opponent by lane', () => {
    const user = getUserData(data, 'left');
    const opp = getOpponentData(data, 'left');
    expect(user.quarterMileET).toBeCloseTo(13.453, 3);
    expect(opp.quarterMileET).toBeCloseTo(12.283, 3);
  });

  it('parses the weather footer row', () => {
    expect(data.weather?.temperatureF).toBeCloseTo(59.2, 1);
    expect(data.weather?.humidityPct).toBeCloseTo(77, 0);
    expect(data.weather?.densityAltitude).toBe(391);
  });
});

describe('parseTimeslipText — partial slip leaves missing fields blank', () => {
  const data = parseTimeslipText(SLIP_PARTIAL);

  it('parses the left lane that ran', () => {
    expect(data.left.reactionTime).toBeCloseTo(0.78, 3);
    expect(data.left.sixtyFt).toBeCloseTo(2.507, 3);
    expect(data.left.threeThirtyFt).toBeCloseTo(6.563, 3);
    expect(data.left.eighthMileET).toBeCloseTo(9.713, 3);
    expect(data.left.quarterMileET).toBeCloseTo(14.689, 3);
    expect(data.left.quarterMileMPH).toBeCloseTo(99.11, 2);
  });

  it('leaves missing right-lane fields undefined (not guessed)', () => {
    expect(data.right.threeThirtyFt).toBeUndefined();
    expect(data.right.eighthMileET).toBeUndefined();
    expect(data.right.thousandFt).toBeUndefined();
    expect(data.right.quarterMileET).toBeUndefined();
    expect(data.right.quarterMileMPH).toBeUndefined();
  });

  it('still parses the fields the right lane did show', () => {
    expect(data.right.reactionTime).toBeCloseTo(0.851, 3);
    expect(data.right.sixtyFt).toBeCloseTo(4.52, 3);
  });

  it('parses weather with a 4-digit density altitude', () => {
    expect(data.weather?.temperatureF).toBeCloseTo(70.5, 1);
    expect(data.weather?.humidityPct).toBeCloseTo(56, 0);
    expect(data.weather?.densityAltitude).toBe(3007);
  });
});

describe('parseTimeslipText — car number extraction from header line', () => {
  it('extracts car numbers from "211 234 234" header (3-number format)', () => {
    const data = parseTimeslipText(SLIP_FULL);
    expect(data.left.carNumber).toBe('211');
    expect(data.right.carNumber).toBe('234');
  });

  it('extracts car numbers from "149 149 689" header (partial duplicate)', () => {
    const data = parseTimeslipText(SLIP_PARTIAL);
    expect(data.left.carNumber).toBe('149');
    expect(data.right.carNumber).toBe('689');
  });
});

describe('normalizeTimingField — OCR decimal dropout recovery', () => {
  it('recovers 330ft when OCR drops decimal: 5794 → 5.794', () => {
    const slip = `5794 330' 5099\n13453 E.T. 12283\n104850 Mph 111550`;
    const data = parseTimeslipText(slip);
    expect(data.left.threeThirtyFt).toBeCloseTo(5.794, 3);
    expect(data.right.threeThirtyFt).toBeCloseTo(5.099, 3);
    expect(data.left.quarterMileET).toBeCloseTo(13.453, 3);
    expect(data.right.quarterMileET).toBeCloseTo(12.283, 3);
  });
});

describe('parseWeather — footer variations from the screenshots', () => {
  it('59.2°F / 77% / 391 ft', () => {
    const w = parseWeather('59.2°F 77% 391 ft');
    expect(w?.temperatureF).toBeCloseTo(59.2, 1);
    expect(w?.humidityPct).toBe(77);
    expect(w?.densityAltitude).toBe(391);
  });

  it('70.5°F / 56% / 3007 ft', () => {
    const w = parseWeather('70.5°F 56% 3007 ft');
    expect(w?.temperatureF).toBeCloseTo(70.5, 1);
    expect(w?.humidityPct).toBe(56);
    expect(w?.densityAltitude).toBe(3007);
  });

  it('57.4°F / 81% / 271 ft', () => {
    const w = parseWeather('57.4°F 81% 271 ft');
    expect(w?.temperatureF).toBeCloseTo(57.4, 1);
    expect(w?.humidityPct).toBe(81);
    expect(w?.densityAltitude).toBe(271);
  });

  it('63.3°F / 71% / 2504 ft', () => {
    const w = parseWeather('63.3°F 71% 2504 ft');
    expect(w?.temperatureF).toBeCloseTo(63.3, 1);
    expect(w?.humidityPct).toBe(71);
    expect(w?.densityAltitude).toBe(2504);
  });

  it('returns undefined when there is no weather row', () => {
    expect(parseWeather('just some timing 1.234 numbers 5.678')).toBeUndefined();
  });
});

describe('getUserData / getOpponentData — car number lane assignment', () => {
  const ALPHANUMERIC_SLIP = 'LEFT: A211\nRIGHT: X234\n1.234 R/T 1.456\n13.500 E.T. 13.750';

  it('select left → my car number = A211, opponent car number = X234', () => {
    const data = parseTimeslipText(ALPHANUMERIC_SLIP);
    expect(getUserData(data, 'left').carNumber).toBe('A211');
    expect(getOpponentData(data, 'left').carNumber).toBe('X234');
  });

  it('select right → my car number = X234, opponent car number = A211', () => {
    const data = parseTimeslipText(ALPHANUMERIC_SLIP);
    expect(getUserData(data, 'right').carNumber).toBe('X234');
    expect(getOpponentData(data, 'right').carNumber).toBe('A211');
  });
});

describe('parseTimeslipText — alphanumeric car numbers', () => {
  it('extracts plain numeric car numbers from LEFT/RIGHT header', () => {
    const slip = 'LEFT: 211\nRIGHT: 234\n1.234 R/T 1.456\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.left.carNumber).toBe('211');
    expect(data.right.carNumber).toBe('234');
  });

  it('preserves letter-prefixed car number (e.g. A211)', () => {
    const slip = 'LEFT: A211\nRIGHT: B234\n1.234 R/T 1.456\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.left.carNumber).toBe('A211');
    expect(data.right.carNumber).toBe('B234');
  });

  it('extracts alphanumeric car number from 2-token header line', () => {
    const slip = 'A211 X99\n1.234 R/T 1.456\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.left.carNumber).toBe('A211');
    expect(data.right.carNumber).toBe('X99');
  });

  it('does not extract car numbers from a plain-text header with no digits', () => {
    const slip = 'MOV WIN\n1.234 R/T 1.456\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.left.carNumber).toBeUndefined();
    expect(data.right.carNumber).toBeUndefined();
  });
});

describe('parseTimeslipText — combined date+time extraction', () => {
  it('extracts date and time when they appear on the same line', () => {
    const slip = '10/03/2025 20:36:39\n1.234 R/T 1.456\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.date).toBe('10/03/2025');
    expect(data.time).toBe('20:36:39');
  });

  it('falls back to separate matches when date and time are on different lines', () => {
    const slip = '10/03/2025\nsome line\n20:36\n13.500 E.T. 13.750';
    const data = parseTimeslipText(slip);
    expect(data.date).toBe('10/03/2025');
    expect(data.time).toBe('20:36');
  });
});
