import { google, sheets_v4 } from 'googleapis';
import { Bookstore, Feature, Event, InsertBookstore, InsertFeature, InsertEvent } from '@shared/schema';

// Spreadsheet IDs and range names
interface SheetsConfig {
  spreadsheetId: string;
  bookstoreRange: string;
  featuresRange: string;
  eventsRange: string;
}

// Default sheet configuration
const DEFAULT_CONFIG: SheetsConfig = {
  spreadsheetId: '1yNAa3R7QnIqKJRJPT4L5TYMDPzOiqhQvPyXvJUKjQnQ', // Replace with your actual spreadsheet ID
  bookstoreRange: 'Bookstores!A2:Z',
  featuresRange: 'Features!A2:Z',
  eventsRange: 'Events!A2:Z',
};

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private config: SheetsConfig;

  constructor(config: SheetsConfig = DEFAULT_CONFIG) {
    this.config = config;
    
    try {
      // Check if credentials are available
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        throw new Error('Google service account credentials not found in environment');
      }
      
      // Initialize with just the API version
      this.sheets = google.sheets({
        version: 'v4'
      });
      
      console.log('Google Sheets service initialized');
    } catch (error) {
      console.error('Error initializing Google Sheets service:', error);
      throw error;
    }
  }

  // Fetch all bookstores from the Google Sheet
  async getBookstores(): Promise<Bookstore[]> {
    try {
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
          // id, name, street, city, state, zip, description, imageUrl, website, phone, latitude, longitude, featureIds
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
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.eventsRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No event data found in the spreadsheet');
        return [];
      }

      // Convert rows to Event objects
      const events: Event[] = rows.map((row, index) => {
        try {
          // Assuming columns are in this order: id, bookstoreId, title, description, date, time
          const id = parseInt(row[0] || '0');
          const bookstoreId = parseInt(row[1] || '0');
          const title = row[2] || '';
          const description = row[3] || '';
          const date = row[4] || '';
          const time = row[5] || '';

          return {
            id,
            bookstoreId,
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

  // Fetch events for a specific bookstore
  async getEventsByBookstore(bookstoreId: number): Promise<Event[]> {
    const allEvents = await this.getEvents();
    return allEvents.filter(event => event.bookstoreId === bookstoreId);
  }
}

// Create and export a singleton instance
export const googleSheetsService = new GoogleSheetsService();