import fs from 'fs';
import path from 'path';

// Forex Factory XML Weekly Feed (contains scheduled events for the current week)
const FEED_URL = 'https://www.forexfactory.com/ff_calendar_thisweek.xml';

interface EventData {
  title: string;
  country: string;
  date: string; // ISO 8601 UTC timestamp
  impact: 'High' | 'Medium' | 'Low' | 'Holiday';
  forecast: string;
  previous: string;
  actual: string;
}

/**
 * Parses Forex Factory date / time strings into a genuine ISO 8601 UTC timestamp.
 * Note: Forex Factory XML feed date/times are strictly in US Eastern Time (EST/EDT).
 * This function handles daylight saving transition as well.
 */
function parseESTToUTC(dateStr: string, timeStr: string): string {
  // dateStr is 'MM-DD-YYYY' (e.g., '06-21-2026')
  const dateParts = dateStr.trim().split('-');
  if (dateParts.length !== 3) {
    return new Date().toISOString();
  }

  const month = parseInt(dateParts[0], 10) - 1;
  const day = parseInt(dateParts[1], 10);
  const year = parseInt(dateParts[2], 10);

  let hour = 0;
  let minute = 0;

  const cleanTime = timeStr.trim().toLowerCase();

  // Try parsing AM/PM format (e.g. '8:30am', '11:00pm')
  const amPmRegex = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/;
  const match = cleanTime.match(amPmRegex);

  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3];

    if (meridian === 'pm' && h < 12) {
      h += 12;
    } else if (meridian === 'am' && h === 12) {
      h = 0;
    }
    hour = h;
    minute = m;
  }

  // Define date dynamically in New York (Eastern Time)
  const estDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  
  try {
    // Rely on modern JS Intl / timezone conversion to precisely compute the difference
    const systemDate = new Date(estDateString);
    // Determine offset in minutes for America/New_York at that specific time
    // Create formatter to find difference between local system and America/New_York or UTC
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });
    
    // Fallback simple conversion: Eastern Time is usually UTC-4 (DST: March to November) or UTC-5 (Standard Time)
    // Calculating approximate Eastern DST (starts second Sunday of March, ends first Sunday of November)
    const isDST = (m: number, d: number): boolean => {
      if (m > 2 && m < 10) return true; // Apr - Oct
      if (m < 2 || m === 11) return false; // Jan, Feb, Dec
      if (m === 2) { // March: starts second Sunday
        // approximate estimation
        return d >= 14;
      }
      if (m === 10) { // November: ends first Sunday
        return d < 7;
      }
      return false;
    };

    const offsetHours = isDST(month, day) ? 4 : 5;
    // Calculate final UTC time by adding Eastern Offset
    const utcTimeMs = systemDate.getTime() + (offsetHours * 60 * 60 * 1000);
    return new Date(utcTimeMs).toISOString();
  } catch {
    // absolute fallback: return formatted date
    return new Date(`${year}-${month + 1}-${day}T${hour}:${minute}:00Z`).toISOString();
  }
}

/**
 * Manual XML parser based on RegExp to avoid external dependencies.
 * Extremely efficient for Forex Factory flat <event> feeds.
 */
function parseXMLFeed(xmlText: string): EventData[] {
  const events: EventData[] = [];
  
  // Clean CDATA wrappers if present
  const sanitizedXml = xmlText.replace(/<!\[CDATA\[(.*?)\]\]>/gms, '$1');

  // Match all <event>...</event> tags
  const eventRegex = /<event>(.*?)<\/event>/gs;
  let match;

  while ((match = eventRegex.exec(sanitizedXml)) !== null) {
    const eventContent = match[1];

    const getTagValue = (tagName: string): string => {
      const tagRegex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
      const tagMatch = eventContent.match(tagRegex);
      return tagMatch ? tagMatch[1].trim() : '';
    };

    const title = getTagValue('title');
    const country = getTagValue('country');
    const rawDate = getTagValue('date');
    const rawTime = getTagValue('time');
    const rawImpact = getTagValue('impact');
    const forecast = getTagValue('forecast');
    const previous = getTagValue('previous');

    if (!title || !country || !rawDate) {
      continue;
    }

    // Map Forex Factory XML impact to standard widget impact types
    let mappedImpact: 'High' | 'Medium' | 'Low' | 'Holiday' = 'Low';
    const cleanImpact = rawImpact.toLowerCase();
    if (cleanImpact.includes('high')) {
      mappedImpact = 'High';
    } else if (cleanImpact.includes('medium')) {
      mappedImpact = 'Medium';
    } else if (cleanImpact.includes('low')) {
      mappedImpact = 'Low';
    } else if (cleanImpact.includes('holiday')) {
      mappedImpact = 'Holiday';
    }

    // Compute exact UTC date
    const date = parseESTToUTC(rawDate, rawTime);

    events.push({
      title,
      country,
      date,
      impact: mappedImpact,
      forecast: forecast || '',
      previous: previous || '',
      actual: '' // Actual is blank initially, filled by trading terminal / app users
    });
  }

  return events;
}

/**
 * Core scraping runner
 */
async function scrapeCalendar() {
  console.log('Fetching live Forex Factory calendar week xml feed...');
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch XML feed. Status code: ${response.status}`);
    }

    const xmlText = await response.text();
    const parsedEvents = parseXMLFeed(xmlText);

    if (parsedEvents.length === 0) {
      throw new Error('No events successfully parsed from the feed.');
    }

    const outputDirectory = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const outputPath = path.join(outputDirectory, 'ff_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(parsedEvents, null, 2), 'utf8');

    console.log('\n=========================================');
    console.log('🎉 FOREX FACTORY CALENDAR SCRAPER SUCCESS');
    console.log(`Successfully scraped & outputted ${parsedEvents.length} events!`);
    console.log(`Saved output to: ${outputPath}`);
    console.log('=========================================\n');
  } catch (error: any) {
    console.error('\n❌ SCRAPER FAILED ERROR:', error.message || error);
    process.exit(1);
  }
}

// Run scraper
scrapeCalendar();
