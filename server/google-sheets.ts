import { google, sheets_v4 } from 'googleapis';
import { Bookstore, Feature, Event } from '@shared/schema';

interface SheetsConfig {
  spreadsheetId: string;
  bookstoreRange: string;
  featuresRange: string;
  eventsRange: string;
}

// Get spreadsheet ID from environment variable or use default
// You can set GOOGLE_SHEETS_ID as an environment variable in your Replit Secrets
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1Qa3AW5Zmu0X4yT3fXjmoU62Drqz0oMKRsXsm3a7JiQs';

// Default configuration
const DEFAULT_CONFIG: SheetsConfig = {
  spreadsheetId: SPREADSHEET_ID,
  bookstoreRange: 'Bookstores!A2:O', // Added an additional column for 'live' field
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

  // Fetch all bookstores from the Google Sheet
  async getBookstores(): Promise<Bookstore[]> {
    try {
      console.log(`Fetching bookstores from Google Sheets range: ${this.config.bookstoreRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.bookstoreRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No bookstore data found in the spreadsheet');
        return [];
      }

      // Convert rows to Bookstore objects
      const bookstores: Bookstore[] = rows.map((row, index) => {
        try {
          // Assuming columns are in this order:
          // id, name, street, city, state, zip, description, imageUrl, website, phone, hours (JSON), latitude, longitude, featureIds (comma-separated)
          const id = parseInt(row[0] || '0');
          const name = row[1] || '';
          const street = row[2] || '';
          const city = row[3] || '';
          const state = row[4] || '';
          const zip = row[5] || '';
          const description = row[6] || '';
          const imageUrl = row[7] || null;
          const website = row[8] || null;
          const phone = row[9] || null;
          
          // Parse hours (if provided in JSON format)
          let hours = null;
          try {
            if (row[10]) {
              hours = JSON.parse(row[10]);
            }
          } catch (e) {
            console.error(`Error parsing hours for bookstore ${id}:`, e);
          }

          const latitude = row[11] || null;
          const longitude = row[12] || null;
          
          // Parse feature IDs (comma-separated string of IDs)
          let featureIds: number[] | null = null;
          try {
            if (row[13]) {
              featureIds = row[13].split(',').map(id => parseInt(id.trim()));
            }
          } catch (e) {
            console.error(`Error parsing featureIds for bookstore ${id}:`, e);
          }
          
          // Parse live status (default to true if not provided)
          let live = true;
          try {
            if (row[14] !== undefined) {
              // Convert various string formats to boolean
              const liveStr = String(row[14]).trim().toLowerCase();
              live = liveStr === 'yes' || liveStr === 'true' || liveStr === '1';
            }
          } catch (e) {
            console.error(`Error parsing live status for bookstore ${id}:`, e);
          }

          return {
            id,
            name,
            street,
            city,
            state,
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
          console.error(`Error processing bookstore row ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as Bookstore[];

      console.log(`Retrieved ${bookstores.length} bookstores from Google Sheets`);
      return bookstores;
    } catch (error) {
      console.error('Error fetching bookstores from Google Sheets:', error);
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