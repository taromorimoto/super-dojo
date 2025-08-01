// ICS parsing utilities - extracted for better testability

// Parse ICS property with parameters (e.g., "DTSTART;TZID=Europe/Helsinki:20220401T180000")
export const parseICSProperty = (propertyLine: string): { value: string; params: Record<string, string> } => {
  const colonIndex = propertyLine.indexOf(':');
  if (colonIndex === -1) {
    return { value: propertyLine, params: {} };
  }

  const propertyPart = propertyLine.substring(0, colonIndex);
  const value = propertyLine.substring(colonIndex + 1);
  const params: Record<string, string> = {};

  // Parse parameters (format: PROPERTY;PARAM1=VALUE1;PARAM2=VALUE2:VALUE)
  const parts = propertyPart.split(';');
  for (let i = 1; i < parts.length; i++) {
    const paramPart = parts[i];
    const equalIndex = paramPart.indexOf('=');
    if (equalIndex !== -1) {
      const paramName = paramPart.substring(0, equalIndex);
      const paramValue = paramPart.substring(equalIndex + 1);
      params[paramName] = paramValue;
    }
  }

  return { value, params };
};

// Parse ICS date format to timestamp with timezone support
export const parseICSDate = (dateStr: string, timezone?: string): number => {
  // Check if this is a full property line (contains semicolon or starts with property name)
  if (dateStr.includes(';') || dateStr.startsWith('DTSTART') || dateStr.startsWith('DTEND') || dateStr.startsWith('EXDATE')) {
    const parsed = parseICSProperty(dateStr);
    return parseICSDate(parsed.value, parsed.params.TZID);
  }

  // Handle different ICS date formats
  if (dateStr.includes('T')) {
    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
    const isUTC = dateStr.endsWith('Z');
    const cleanDate = dateStr.replace(/[TZ]/g, '');
    const year = parseInt(cleanDate.substr(0, 4));
    const month = parseInt(cleanDate.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(cleanDate.substr(6, 2));
    const hour = parseInt(cleanDate.substr(8, 2)) || 0;
    const minute = parseInt(cleanDate.substr(10, 2)) || 0;
    const second = parseInt(cleanDate.substr(12, 2)) || 0;

    if (isUTC) {
      // UTC time - create directly
      return new Date(Date.UTC(year, month, day, hour, minute, second)).getTime();
    } else if (timezone) {
      // Timezone-specific time - convert to UTC
      try {
        // Create an ISO string from the parsed components
        const isoString = `${year.toString().padStart(4, '0')}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;

        // Parse the date assuming it's in the specified timezone
        // We create two dates: one interpreting the time as local, one as the target timezone
        const asLocal = new Date(isoString);
        const asTargetTZ = new Date(asLocal.toLocaleString('sv-SE', { timeZone: timezone }));

        // Calculate the offset between them
        const offset = asLocal.getTime() - asTargetTZ.getTime();

        // Apply the offset to get the correct UTC timestamp
        return asLocal.getTime() + offset;
      } catch (error) {
        console.warn(`Invalid timezone ${timezone}, falling back to local time`);
        // Fall back to local time
        return new Date(year, month, day, hour, minute, second).getTime();
      }
    } else {
      // Local time
      return new Date(year, month, day, hour, minute, second).getTime();
    }
  } else {
    // Format: YYYYMMDD (all-day event)
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1;
    const day = parseInt(dateStr.substr(6, 2));

    // All-day events are typically treated as starting at midnight in the local timezone
    if (timezone) {
      try {
        const isoString = `${year.toString().padStart(4, '0')}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`;
        const asLocal = new Date(isoString);
        const asTargetTZ = new Date(asLocal.toLocaleString('sv-SE', { timeZone: timezone }));
        const offset = asLocal.getTime() - asTargetTZ.getTime();
        return asLocal.getTime() + offset;
      } catch (error) {
        console.warn(`Invalid timezone ${timezone}, falling back to local time`);
        return new Date(year, month, day).getTime();
      }
    } else {
      return new Date(year, month, day).getTime();
    }
  }
};

// Parse EXDATE (exception dates) from ICS
export const parseExDates = (exDateStr: string | null | undefined): number[] => {
  if (!exDateStr) return [];

  // Check if this is a full property line with timezone info
  if (exDateStr.includes(';') || exDateStr.startsWith('EXDATE')) {
    const parsed = parseICSProperty(exDateStr);
    const dates = parsed.value.split(',');
    return dates.map(dateStr => parseICSDate(dateStr.trim(), parsed.params.TZID));
  } else {
    // Legacy format - just date values
    const dates = exDateStr.split(',');
    return dates.map(dateStr => parseICSDate(dateStr.trim()));
  }
};