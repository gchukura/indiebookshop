import { google, sheets_v4 } from 'googleapis';
import { Bookstore, Feature, Event } from '@shared/schema';

interface SheetsConfig {
  spreadsheetId: string;
  bookshopRange: string;
  featuresRange: string;
  eventsRange: string;
}

// Get spreadsheet ID from environment variable or use default
// You can set GOOGLE_SHEETS_ID as an environment variable in your Replit Secrets
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1JUCiom4eXWoVdwqMGhCJwjGzVWVYCaj_oRc0VQEX2CQ'; // Using the ID from the environment logs

// Default configuration
const DEFAULT_CONFIG: SheetsConfig = {
  spreadsheetId: SPREADSHEET_ID,
  bookshopRange: 'Bookstores!A2:P', // Updated range to include county column
  featuresRange: 'Features!A2:B',    // Assumes headers are in row 1
  eventsRange: 'Events!A2:F'         // Assumes headers are in row 1
};

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private config: SheetsConfig;

  constructor(config: SheetsConfig = DEFAULT_CONFIG) {
    this.config = config;
    
    try {
      // Check if credentials are available
      if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        try {
          // Parse credentials
          const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
          
          // Create a JWT auth client using service account credentials
          const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
          });
          
          // Create Google Sheets client
          this.sheets = google.sheets({ version: 'v4', auth });
          
          console.log('Google Sheets service initialized with service account credentials');
        } catch (credError) {
          console.error('Error parsing credentials, using API key as fallback:', credError);
          
          // Fallback to API key
          this.sheets = google.sheets({
            version: 'v4',
            auth: 'AIzaSyC9gqxl8dSZ-DU9K6MspQFvGV8rjLKUFoI' // Placeholder API key
          });
        }
      } else {
        console.warn('No Google service account credentials found, using API key');
        
        // Use API key if no credentials
        this.sheets = google.sheets({
          version: 'v4',
          auth: 'AIzaSyC9gqxl8dSZ-DU9K6MspQFvGV8rjLKUFoI' // Placeholder API key
        });
      }
      
      console.log('Google Sheets service initialized');
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      throw error;
    }
  }

  // Fetch all bookshops from the Google Sheet
  async getBookstores(): Promise<Bookstore[]> {
    try {
      // First fetch the header row to determine column positions
      console.log(`Fetching headers from Google Sheets`);
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Bookstores!A1:Z1', // Get all potential headers in the first row
      });
      
      const headers = headerResponse.data.values?.[0] || [];
      if (!headers || headers.length === 0) {
        console.error('No headers found in the spreadsheet');
        return [];
      }
      
      // Create a map of column names to their indices
      const columnMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        if (header && typeof header === 'string') {
          columnMap[header.toLowerCase().trim()] = index;
        }
      });
      
      console.log(`Found headers: ${JSON.stringify(headers)}`);
      console.log(`Column mapping: ${JSON.stringify(columnMap)}`);
      
      // Check for required columns
      const requiredColumns = ['id', 'name', 'street', 'city', 'state', 'zip', 'description'];
      const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
      if (missingColumns.length > 0) {
        console.error(`Missing required columns in spreadsheet: ${missingColumns.join(', ')}`);
      }
      
      // Now fetch all the data
      console.log(`Fetching bookshops from Google Sheets range: ${this.config.bookshopRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.bookshopRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No bookshop data found in the spreadsheet');
        return [];
      }

      // Log data retrieval info
      console.log(`Retrieved ${rows.length} rows from Google Sheets`);
      
      // Check for county data
      const countyIndex = columnMap['county'];
      if (countyIndex !== undefined) {
        console.log(`Found 'county' column at index ${countyIndex}`);
        
        // Count rows with county data
        const rowsWithCountyData = rows.filter(row => row.length > countyIndex && row[countyIndex]);
        console.log(`Found ${rowsWithCountyData.length} rows with county data`);
        
        if (rowsWithCountyData.length > 0) {
          const countySamples = rowsWithCountyData.slice(0, 3)
            .map(row => `${row[columnMap['name'] || 1]} (${row[columnMap['state'] || 4]}): ${row[countyIndex]}`)
            .join(', ');
          console.log(`County samples: ${countySamples}`);
        }
      } else {
        console.log('No county column found in the spreadsheet headers');
      }
      
      // Convert rows to Bookstore objects using column mapping
      const bookshops: Bookstore[] = rows.map((row, index) => {
        try {
          // Get values using column indices from the map
          const getValue = (columnName: string, defaultValue: any = '') => {
            const idx = columnMap[columnName];
            return idx !== undefined && idx < row.length ? row[idx] : defaultValue;
          };
          
          const id = parseInt(getValue('id', '0'));
          const name = getValue('name', '');
          const street = getValue('street', '');
          const city = getValue('city', '');
          const state = getValue('state', '');
          const zip = getValue('zip', '');
          const description = getValue('description', '');
          const imageUrl = getValue('imageurl', null);
          const website = getValue('website', null);
          const phone = getValue('phone', null);
          
          // Parse hours (if provided in JSON format)
          let hours = null;
          try {
            const hoursValue = getValue('hours', null);
            if (hoursValue && typeof hoursValue === 'string') {
              // Only attempt to parse if it looks like JSON (starts with { and ends with })
              if (hoursValue.trim().startsWith('{') && hoursValue.trim().endsWith('}')) {
                hours = JSON.parse(hoursValue);
              } else {
                // If not valid JSON format, store as-is
                hours = hoursValue;
              }
            }
          } catch (e) {
            // Instead of logging the error, just use the raw value
            hours = getValue('hours', null);
            console.log(`Using raw hours value for bookshop ${id}`);
          }

          const latitude = getValue('latitude', null);
          const longitude = getValue('longitude', null);
          
          // Parse feature IDs (comma-separated string of IDs)
          let featureIds: number[] | null = null;
          try {
            const featureIdsValue = getValue('featureids', null);
            if (featureIdsValue) {
              featureIds = featureIdsValue.split(',').map((idStr: string) => parseInt(idStr.trim()));
            }
          } catch (e) {
            console.error(`Error parsing featureIds for bookshop ${id}:`, e);
          }
          
          // Parse live status (default to true if not provided)
          let live = true;
          try {
            const liveValue = getValue('live', 'true');
            if (liveValue !== undefined) {
              // Convert various string formats to boolean
              const liveStr = String(liveValue).trim().toLowerCase();
              live = liveStr === 'yes' || liveStr === 'true' || liveStr === '1';
            }
          } catch (e) {
            console.error(`Error parsing live status for bookshop ${id}:`, e);
          }
          
          // Get county information from the county column
          const county = getValue('county', null);

          return {
            id,
            name,
            street,
            city,
            state,
            county,
            zip,
            description,
            imageUrl,
            website,
            phone,
            hours,
            latitude,
            longitude,
            featureIds,
            live,
          };
        } catch (error) {
          console.error(`Error processing bookshop row ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as Bookstore[];

      console.log(`Retrieved ${bookshops.length} bookshops from Google Sheets`);
      return bookshops;
    } catch (error) {
      console.error('Error fetching bookshops from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch all features from the Google Sheet
  async getFeatures(): Promise<Feature[]> {
    try {
      console.log(`Fetching features from Google Sheets range: ${this.config.featuresRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.featuresRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No feature data found in the spreadsheet');
        return [];
      }

      // Convert rows to Feature objects
      const features: Feature[] = rows.map((row, index) => {
        try {
          // Assuming columns are in this order: id, name
          const id = parseInt(row[0] || '0');
          const name = row[1] || '';

          return { id, name };
        } catch (error) {
          console.error(`Error processing feature row ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as Feature[];

      console.log(`Retrieved ${features.length} features from Google Sheets`);
      return features;
    } catch (error) {
      console.error('Error fetching features from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch all events from the Google Sheet
  async getEvents(): Promise<Event[]> {
    try {
      console.log(`Fetching events from Google Sheets range: ${this.config.eventsRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.eventsRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No event data found in the spreadsheet');
        return [];
      }

      console.log('First row headers:', rows[0]); // Log headers to understand structure
      
      // Check if we have headers
      const headers = rows[0].map((header: string) => header.toLowerCase());
      const hasHeaders = headers.includes('id') && headers.includes('bookshopid');
      
      // If first row contains headers, skip it
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      
      // Expected column structure based on user input:
      // id, bookshopId, title, description, date, time
      
      // Convert rows to Event objects
      const events: Event[] = dataRows.map((row, index) => {
        try {
          if (row.length < 4) {
            console.warn(`Row ${index} has insufficient data, skipping`);
            return null;
          }
          
          const id = parseInt(row[0] || '0');
          const bookshopId = parseInt(row[1] || '0');
          const title = row[2] || '';
          const description = row[3] || '';
          const date = row[4] || '';
          const time = row[5] || '';

          return {
            id,
            bookshopId,
            title,
            description,
            date,
            time,
          };
        } catch (error) {
          console.error(`Error processing event row ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as Event[];

      console.log(`Retrieved ${events.length} events from Google Sheets`);
      return events;
    } catch (error) {
      console.error('Error fetching events from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch events for a specific bookshop
  async getEventsByBookshop(bookshopId: number): Promise<Event[]> {
    const allEvents = await this.getEvents();
    return allEvents.filter(event => event.bookshopId === bookshopId);
  }
}

// Create and export a singleton instance
export const googleSheetsService = new GoogleSheetsService();