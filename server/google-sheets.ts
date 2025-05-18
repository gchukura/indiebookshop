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
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1Qa3AW5Zmu0X4yT3fXjmoU62Drqz0oMKRsXsm3a7JiQs';

// Default configuration
const DEFAULT_CONFIG: SheetsConfig = {
  spreadsheetId: SPREADSHEET_ID,
  bookshopRange: 'Bookstores!A1:P', // Include headers (A1) and all columns including county
  featuresRange: 'Features!A1:B',    // Include headers in row 1
  eventsRange: 'Events!A1:F'         // Include headers in row 1
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

      // The first row contains headers
      const headers = rows[0].map((header: string) => 
        header.toLowerCase().trim().replace(/\s+/g, '_')
      );
      
      console.log('Bookstore headers:', headers);
      
      // Create a function to get column index by header name
      const getColumnIndex = (name: string) => {
        const index = headers.indexOf(name);
        return index >= 0 ? index : null;
      };
      
      // Map column headers to indices
      const columnMap = {
        id: getColumnIndex('id'),
        name: getColumnIndex('name'),
        street: getColumnIndex('street'),
        city: getColumnIndex('city'),
        state: getColumnIndex('state'),
        zip: getColumnIndex('zip'),
        county: getColumnIndex('county'), // New county field
        description: getColumnIndex('description'),
        imageUrl: getColumnIndex('imageurl') || getColumnIndex('image_url'),
        website: getColumnIndex('website'),
        phone: getColumnIndex('phone'),
        hours: getColumnIndex('hours'),
        latitude: getColumnIndex('latitude') || getColumnIndex('lat'),
        longitude: getColumnIndex('longitude') || getColumnIndex('lng'),
        featureIds: getColumnIndex('featureids') || getColumnIndex('feature_ids'),
        live: getColumnIndex('live')
      };
      
      // Log column mapping for debugging
      console.log('Column mapping:', columnMap);
      
      // Skip header row
      const dataRows = rows.slice(1);
      
      // Convert rows to Bookstore objects
      const bookshops: Bookstore[] = dataRows.map((row, index) => {
        try {
          // Get values using column indices from our map
          const getValue = (key: string, defaultValue: any = '') => {
            const colIndex = columnMap[key as keyof typeof columnMap];
            return colIndex !== null && row[colIndex] !== undefined ? row[colIndex] : defaultValue;
          };
          
          const id = parseInt(getValue('id', '0'));
          const name = getValue('name', '');
          const street = getValue('street', '');
          const city = getValue('city', '');
          const state = getValue('state', '');
          const zip = getValue('zip', '');
          const description = getValue('description', '');
          const imageUrl = getValue('imageUrl', null);
          const website = getValue('website', null);
          const phone = getValue('phone', null);
          
          // Parse hours (if provided in JSON format)
          let hours = null;
          try {
            const hoursValue = getValue('hours', null);
            if (hoursValue) {
              hours = JSON.parse(hoursValue);
            }
          } catch (e) {
            console.error(`Error parsing hours for bookshop ${id}:`, e);
          }

          const latitude = getValue('latitude', null);
          const longitude = getValue('longitude', null);
          
          // Parse feature IDs (comma-separated string of IDs)
          let featureIds: number[] | null = null;
          try {
            const featureIdsValue = getValue('featureIds', null);
            if (featureIdsValue) {
              featureIds = featureIdsValue.split(',').map((idStr: string) => parseInt(idStr.trim()));
            }
          } catch (e) {
            console.error(`Error parsing featureIds for bookshop ${id}:`, e);
          }
          
          // Parse live status (default to true if not provided)
          let live = true;
          try {
            const liveValue = getValue('live');
            if (liveValue !== '') {
              // Convert various string formats to boolean
              const liveStr = String(liveValue).trim().toLowerCase();
              live = liveStr === 'yes' || liveStr === 'true' || liveStr === '1';
            }
          } catch (e) {
            console.error(`Error parsing live status for bookshop ${id}:`, e);
          }
          
          // Get county value (new field)
          const county = getValue('county', null);

          // Build the bookshop object with standard fields
          const bookshop: any = {
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
          
          // Add county if it exists
          if (county) {
            bookshop.county = county;
          }

          return bookshop;
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
      
      // The first row contains headers
      const headers = rows[0].map((header: string) => 
        header.toLowerCase().trim().replace(/\s+/g, '_')
      );
      
      console.log('Feature headers:', headers);
      
      // Create a function to get column index by header name
      const getColumnIndex = (name: string) => {
        const index = headers.indexOf(name);
        return index >= 0 ? index : null;
      };
      
      // Map column headers to indices
      const columnMap = {
        id: getColumnIndex('id'),
        name: getColumnIndex('name')
      };
      
      // Skip header row
      const dataRows = rows.slice(1);

      // Convert rows to Feature objects
      const features: Feature[] = dataRows.map((row, index) => {
        try {
          // Get values using column indices from our map
          const getValue = (key: string, defaultValue: any = '') => {
            const colIndex = columnMap[key as keyof typeof columnMap];
            return colIndex !== null && row[colIndex] !== undefined ? row[colIndex] : defaultValue;
          };
          
          const id = parseInt(getValue('id', '0'));
          const name = getValue('name', '');

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
      
      // The first row contains headers
      const headers = rows[0].map((header: string) => 
        header.toLowerCase().trim().replace(/\s+/g, '_')
      );
      
      console.log('Event headers:', headers);
      
      // Create a function to get column index by header name
      const getColumnIndex = (name: string) => {
        const index = headers.indexOf(name);
        return index >= 0 ? index : null;
      };
      
      // Map column headers to indices
      const columnMap = {
        id: getColumnIndex('id'),
        bookshopId: getColumnIndex('bookshopid') || getColumnIndex('bookshop_id'),
        title: getColumnIndex('title'),
        description: getColumnIndex('description'),
        date: getColumnIndex('date'),
        time: getColumnIndex('time'),
      };
      
      // Skip header row
      const dataRows = rows.slice(1);
      
      // Convert rows to Event objects
      const events: Event[] = dataRows.map((row, index) => {
        try {
          // Get values using column indices from our map
          const getValue = (key: string, defaultValue: any = '') => {
            const colIndex = columnMap[key as keyof typeof columnMap];
            return colIndex !== null && row[colIndex] !== undefined ? row[colIndex] : defaultValue;
          };
          
          // Check if essential fields are available
          if (!columnMap.title || !columnMap.description) {
            console.warn(`Row ${index} missing essential columns, skipping`);
            return null;
          }
          
          const id = parseInt(getValue('id', '0'));
          const bookshopId = parseInt(getValue('bookshopId', '0'));
          const title = getValue('title', '');
          const description = getValue('description', '');
          const date = getValue('date', '');
          const time = getValue('time', '');

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