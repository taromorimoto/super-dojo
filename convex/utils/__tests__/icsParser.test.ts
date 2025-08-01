import { parseICSProperty, parseICSDate, parseExDates } from '../icsParser';

describe('ICS Parser Utils', () => {
  describe('parseICSProperty', () => {
    it('should parse property with timezone parameter', () => {
      const result = parseICSProperty('DTSTART;TZID=Europe/Helsinki:20220401T180000');
      expect(result).toEqual({
        value: '20220401T180000',
        params: { TZID: 'Europe/Helsinki' }
      });
    });

    it('should parse property with multiple parameters', () => {
      const result = parseICSProperty('DTSTART;TZID=America/New_York;VALUE=DATE-TIME:20220401T180000');
      expect(result).toEqual({
        value: '20220401T180000',
        params: {
          TZID: 'America/New_York',
          VALUE: 'DATE-TIME'
        }
      });
    });

    it('should handle property without parameters', () => {
      const result = parseICSProperty('DTSTART:20220401T180000Z');
      expect(result).toEqual({
        value: '20220401T180000Z',
        params: {}
      });
    });

    it('should handle malformed property', () => {
      const result = parseICSProperty('DTSTART-NO-COLON');
      expect(result).toEqual({
        value: 'DTSTART-NO-COLON',
        params: {}
      });
    });
  });

  describe('parseICSDate', () => {
    describe('UTC dates', () => {
      it('should parse UTC date correctly', () => {
        const timestamp = parseICSDate('20220401T180000Z');
        const date = new Date(timestamp);
        expect(date.toISOString()).toBe('2022-04-01T18:00:00.000Z');
      });

      it('should parse UTC date with seconds', () => {
        const timestamp = parseICSDate('20220401T180530Z');
        const date = new Date(timestamp);
        expect(date.toISOString()).toBe('2022-04-01T18:05:30.000Z');
      });
    });

    describe('Timezone-specific dates', () => {
      it('should parse Helsinki timezone correctly (original issue)', () => {
        const timestamp = parseICSDate('DTSTART;TZID=Europe/Helsinki:20220401T180000');
        const date = new Date(timestamp);

        // April 1, 2022 at 18:00 Helsinki time should be 15:00 UTC (Helsinki is UTC+3 in April)
        const expectedUTC = new Date('2022-04-01T15:00:00.000Z').getTime();

        // Allow for small timing differences (within 1 second)
        expect(Math.abs(timestamp - expectedUTC)).toBeLessThan(1000);
        expect(date.getUTCFullYear()).toBe(2022);
        expect(date.getUTCMonth()).toBe(3); // April (0-indexed)
        expect(date.getUTCDate()).toBe(1);
      });

      it('should parse New York timezone correctly', () => {
        const timestamp = parseICSDate('DTSTART;TZID=America/New_York:20220701T180000');
        const date = new Date(timestamp);

        // July 1, 2022 at 18:00 New York time should be 22:00 UTC (EDT is UTC-4 in July)
        const expectedUTC = new Date('2022-07-01T22:00:00.000Z').getTime();

        expect(Math.abs(timestamp - expectedUTC)).toBeLessThan(1000);
        expect(date.getUTCFullYear()).toBe(2022);
        expect(date.getUTCMonth()).toBe(6); // July (0-indexed)
        expect(date.getUTCDate()).toBe(1);
      });

      it('should parse Tokyo timezone correctly', () => {
        const timestamp = parseICSDate('DTSTART;TZID=Asia/Tokyo:20221215T090000');
        const date = new Date(timestamp);

        // December 15, 2022 at 09:00 Tokyo time should be 00:00 UTC (JST is UTC+9)
        const expectedUTC = new Date('2022-12-15T00:00:00.000Z').getTime();

        expect(Math.abs(timestamp - expectedUTC)).toBeLessThan(1000);
        expect(date.getUTCFullYear()).toBe(2022);
        expect(date.getUTCMonth()).toBe(11); // December (0-indexed)
        expect(date.getUTCDate()).toBe(15);
      });
    });

    describe('All-day events', () => {
      it('should parse all-day event date', () => {
        const timestamp = parseICSDate('20220401');
        const date = new Date(timestamp);

        expect(date.getFullYear()).toBe(2022);
        expect(date.getMonth()).toBe(3); // April (0-indexed)
        expect(date.getDate()).toBe(1);
      });
    });

    describe('Error handling', () => {
      it('should handle invalid timezone gracefully', () => {
        const timestamp = parseICSDate('DTSTART;TZID=Invalid/Timezone:20220401T180000');
        const date = new Date(timestamp);

        // Should fall back to local time parsing
        expect(date.getFullYear()).toBe(2022);
        expect(date.getMonth()).toBe(3); // April (0-indexed)
        expect(date.getDate()).toBe(1);
      });
    });

    describe('Regression tests', () => {
      it('should not parse 2022 dates as 2025 (original bug)', () => {
        const timestamp = parseICSDate('DTSTART;TZID=Europe/Helsinki:20220401T180000');
        const date = new Date(timestamp);

        // The bug was showing dates from 2022 as 2025
        expect(date.getUTCFullYear()).toBe(2022);
        expect(date.getUTCFullYear()).not.toBe(2025);
      });

      it('should handle the exact example from the user report', () => {
        const timestamp = parseICSDate('DTSTART;TZID=Europe/Helsinki:20220401T180000');

        // The user reported getting: new Date(1754071200000) = "Fri Aug 01 2025 21:00:00"
        // This was wrong. The correct result should be around April 1, 2022
        expect(timestamp).not.toBe(1754071200000);

        const date = new Date(timestamp);
        expect(date.getUTCFullYear()).toBe(2022);
        expect(date.getUTCMonth()).toBe(3); // April
        expect(date.getUTCDate()).toBe(1);
      });
    });
  });

  describe('parseExDates', () => {
    it('should parse EXDATE with timezone', () => {
      const result = parseExDates('EXDATE;TZID=Europe/Helsinki:20220610T180000,20221021T180000');

      expect(result).toHaveLength(2);

      // Verify the dates are parsed correctly (allowing for timezone conversion)
      const date1 = new Date(result[0]);
      const date2 = new Date(result[1]);

      expect(date1.getUTCFullYear()).toBe(2022);
      expect(date1.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(date1.getUTCDate()).toBe(10);

      expect(date2.getUTCFullYear()).toBe(2022);
      expect(date2.getUTCMonth()).toBe(9); // October (0-indexed)
      expect(date2.getUTCDate()).toBe(21);
    });

    it('should handle empty EXDATE', () => {
      expect(parseExDates('')).toEqual([]);
      expect(parseExDates(null)).toEqual([]);
      expect(parseExDates(undefined)).toEqual([]);
    });

    it('should parse legacy format EXDATE', () => {
      const result = parseExDates('20220610T180000,20221021T180000');

      expect(result).toHaveLength(2);

      const date1 = new Date(result[0]);
      const date2 = new Date(result[1]);

      expect(date1.getFullYear()).toBe(2022);
      expect(date1.getMonth()).toBe(5); // June (0-indexed)
      expect(date1.getDate()).toBe(10);

      expect(date2.getFullYear()).toBe(2022);
      expect(date2.getMonth()).toBe(9); // October (0-indexed)
      expect(date2.getDate()).toBe(21);
    });
  });
});