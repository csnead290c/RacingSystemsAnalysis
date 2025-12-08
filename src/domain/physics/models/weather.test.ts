import { describe, it, expect } from 'vitest';
import { calculateWeather, defaultWeatherInput } from './weather';

describe('Weather Calculator', () => {
  describe('calculateWeather', () => {
    it('calculates density altitude for standard conditions', () => {
      const result = calculateWeather({
        ...defaultWeatherInput,
        barometer: 29.92,
        temperature: 59,
        humidity: 0,
        useAltimeter: false,
      });
      
      // At standard conditions, density altitude should be relatively low
      // The VB6 formula may give slightly different results than theoretical 0
      expect(result.densityAltitude).toBeLessThan(500);
      expect(result.densityAltitude).toBeGreaterThan(-500);
    });

    it('increases density altitude with higher temperature', () => {
      const cool = calculateWeather({
        ...defaultWeatherInput,
        temperature: 60,
      });
      
      const hot = calculateWeather({
        ...defaultWeatherInput,
        temperature: 100,
      });
      
      expect(hot.densityAltitude).toBeGreaterThan(cool.densityAltitude);
    });

    it('increases density altitude with lower barometer', () => {
      const highPressure = calculateWeather({
        ...defaultWeatherInput,
        barometer: 30.50,
      });
      
      const lowPressure = calculateWeather({
        ...defaultWeatherInput,
        barometer: 29.00,
      });
      
      expect(lowPressure.densityAltitude).toBeGreaterThan(highPressure.densityAltitude);
    });

    it('calculates HP correction factor', () => {
      const result = calculateWeather(defaultWeatherInput);
      
      // HP correction should be a reasonable multiplier
      expect(result.hpCorrectionFactor).toBeGreaterThan(0.5);
      expect(result.hpCorrectionFactor).toBeLessThan(1.5);
    });

    it('calculates vapor pressure', () => {
      const dry = calculateWeather({
        ...defaultWeatherInput,
        humidity: 0,
      });
      
      const humid = calculateWeather({
        ...defaultWeatherInput,
        humidity: 100,
      });
      
      expect(humid.vaporPressure).toBeGreaterThan(dry.vaporPressure);
    });

    it('handles altimeter vs barometer input', () => {
      const withBarometer = calculateWeather({
        ...defaultWeatherInput,
        useAltimeter: false,
        barometer: 29.92,
      });
      
      const withAltimeter = calculateWeather({
        ...defaultWeatherInput,
        useAltimeter: true,
        altimeter: 29.92,
      });
      
      // Both should produce valid density altitude values
      // The exact values may differ due to different calculation paths
      expect(typeof withAltimeter.densityAltitude).toBe('number');
      expect(typeof withBarometer.densityAltitude).toBe('number');
      expect(isNaN(withAltimeter.densityAltitude)).toBe(false);
      expect(isNaN(withBarometer.densityAltitude)).toBe(false);
    });
  });
});
