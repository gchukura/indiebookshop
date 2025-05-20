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
  bookshopRange: 'Bookstores!A2:O', // Added an additional column for 'live' field
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
      // First, let's fetch the header row separately
      console.log(`Fetching header row from Google Sheets`);
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Bookstores!A1:Z1', // Get a wider range for the header row
      });
      
      // Get the full data range
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

      let headers: string[] = [];
      let useFirstRowAsHeader = false;
      
      // Try to get headers from first request
      if (headerResponse?.data?.values?.[0]) {
        headers = headerResponse.data.values[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Headers from first row:', headers);
      } else {
        // Fall back to using first row of data as header
        useFirstRowAsHeader = true;
        headers = rows[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Using first data row as headers:', headers);
      }
      
      // Create expected header mappings
      const expectedHeaders = {
        id: ['id', 'bookshop_id', 'bookstore_id', 'shop_id', 'store_id'],
        name: ['name', 'bookshop_name', 'bookstore_name', 'shop_name', 'store_name', 'title'],
        street: ['street', 'address', 'street_address', 'location', 'address_line_1'],
        city: ['city', 'town'],
        state: ['state', 'province', 'region'],
        zip: ['zip', 'zipcode', 'postal_code', 'postcode'],
        county: ['county', 'parish', 'district', 'region'], // Added county mapping
        description: ['description', 'desc', 'about', 'info', 'details'],
        imageUrl: ['imageurl', 'image_url', 'image', 'img', 'photo', 'picture'],
        website: ['website', 'url', 'web', 'site', 'homepage', 'link'],
        phone: ['phone', 'phone_number', 'contact', 'tel', 'telephone'],
        hours: ['hours', 'opening_hours', 'business_hours', 'store_hours', 'times'],
        latitude: ['latitude', 'lat', 'y'],
        longitude: ['longitude', 'lng', 'long', 'x'],
        featureIds: ['featureids', 'feature_ids', 'features', 'tags', 'categories'],
        live: ['live', 'active', 'published', 'visible', 'status']
      };
      
      // Create a mapping of expected field names to actual column indices
      const columnMap: Record<string, number> = {};
      
      // Map each field to its column index
      Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
        // Find first matching header
        const columnIndex = headers.findIndex(header => 
          possibleNames.includes(header)
        );
        
        if (columnIndex !== -1) {
          columnMap[field] = columnIndex;
        }
      });
      
      // If no proper mapping was found and we're using normal order, fallback to positional mapping
      if (Object.keys(columnMap).length < 5) {
        console.log('Insufficient header mapping, falling back to positional mapping');
        // Basic positional fallback for core fields
        columnMap.id = 0;
        columnMap.name = 1;
        columnMap.street = 2;
        columnMap.city = 3;
        columnMap.state = 4;
        columnMap.zip = 5;
        columnMap.description = 6;
        columnMap.imageUrl = 7;
        columnMap.website = 8;
        columnMap.phone = 9;
        columnMap.hours = 10;
        columnMap.latitude = 11;
        columnMap.longitude = 12;
        columnMap.featureIds = 13;
        columnMap.live = 14;
      }
      
      console.log('Field to column mapping:', columnMap);

      // Convert rows to Bookstore objects
      const startIndex = useFirstRowAsHeader ? 1 : 0;
      const bookshops: Bookstore[] = rows.slice(startIndex).map((row, rowIndex) => {
        try {
          // Skip empty or invalid rows
          if (!row || !row.length || !row[0]) {
            return null;
          }
          
          // Helper function to get values by field name
          const getValue = (field: string): string => {
            const index = columnMap[field];
            return index !== undefined && index < row.length ? String(row[index] || '') : '';
          };
          
          // Get required fields with fallbacks
          const id = parseInt(getValue('id') || '0');
          const name = getValue('name') || '';
          const street = getValue('street') || '';
          const city = getValue('city') || '';
          const state = getValue('state') || '';
          const zip = getValue('zip') || '';
          const county = getValue('county') || null; // Add county extraction
          const description = getValue('description') || '';
          const imageUrl = getValue('imageUrl') || null;
          const website = getValue('website') || null;
          const phone = getValue('phone') || null;
          
          // Handle hours with flexibility
          let hours = null;
          try {
            const hoursValue = getValue('hours');
            if (hoursValue) {
              // Try parsing as JSON, but fall back to using the string as-is
              try {
                hours = JSON.parse(hoursValue);
              } catch (e) {
                // If not valid JSON, just use the string value
                hours = hoursValue;
              }
            }
          } catch (e) {
            console.log(`Using hours as string for bookshop ${id}`);
          }

          // Parse geographic coordinates
          const latitude = getValue('latitude') || null;
          const longitude = getValue('longitude') || null;
          
          // Parse feature IDs
          let featureIds: number[] | null = null;
          try {
            const featureIdsValue = getValue('featureIds');
            if (featureIdsValue) {
              featureIds = featureIdsValue.split(',')
                .map((idStr: string) => parseInt(idStr.trim()))
                .filter((id: number) => !isNaN(id)); // Filter out NaN values
            }
          } catch (e) {
            console.log(`No valid featureIds for bookshop ${id}`);
          }
          
          // Parse live status
          let live = true; // Default to true
          try {
            const liveValue = getValue('live');
            if (liveValue !== '') {
              const liveStr = String(liveValue).trim().toLowerCase();
              // Consider "no", "false", "0" as false, everything else as true
              live = !(liveStr === 'no' || liveStr === 'false' || liveStr === '0');
            }
          } catch (e) {
            // Default to true if parsing fails
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
          console.error(`Error processing bookshop at row ${rowIndex + startIndex + 1}:`, error);
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
      // First, let's fetch the header row separately
      console.log(`Fetching feature headers from Google Sheets`);
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Features!A1:Z1', // Get a wider range for the header row
      });
      
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

      let headers: string[] = [];
      let useFirstRowAsHeader = false;
      
      // Try to get headers from first request
      if (headerResponse?.data?.values?.[0]) {
        headers = headerResponse.data.values[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Feature headers from first row:', headers);
      } else {
        // Fall back to using first row of data as header
        useFirstRowAsHeader = true;
        headers = rows[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Using first data row as feature headers:', headers);
      }
      
      // Create expected header mappings
      const expectedHeaders = {
        id: ['id', 'feature_id', 'featureid'],
        name: ['name', 'feature_name', 'featurename', 'title', 'label']
      };
      
      // Create a mapping of expected field names to actual column indices
      const columnMap: Record<string, number> = {};
      
      // Map each field to its column index
      Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
        // Find first matching header
        const columnIndex = headers.findIndex(header => 
          possibleNames.includes(header)
        );
        
        if (columnIndex !== -1) {
          columnMap[field] = columnIndex;
        }
      });
      
      // If no proper mapping was found, fallback to positional mapping
      if (Object.keys(columnMap).length < 2) {
        console.log('Insufficient feature header mapping, falling back to positional mapping');
        columnMap.id = 0;
        columnMap.name = 1;
      }
      
      console.log('Feature field to column mapping:', columnMap);

      // Convert rows to Feature objects
      const startIndex = useFirstRowAsHeader ? 1 : 0;
      const features: Feature[] = rows.slice(startIndex).map((row, rowIndex) => {
        try {
          // Skip empty or invalid rows
          if (!row || !row.length) {
            return null;
          }
          
          // Helper function to get values by field name
          const getValue = (field: string): string => {
            const index = columnMap[field];
            return index !== undefined && index < row.length ? String(row[index] || '') : '';
          };
          
          const id = parseInt(getValue('id') || '0');
          const name = getValue('name') || '';

          return { id, name };
        } catch (error) {
          console.error(`Error processing feature at row ${rowIndex + startIndex + 1}:`, error);
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
      // First, let's fetch the header row separately
      console.log(`Fetching event headers from Google Sheets`);
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Events!A1:Z1', // Get a wider range for the header row
      });
      
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

      let headers: string[] = [];
      let useFirstRowAsHeader = false;
      
      // Try to get headers from first request
      if (headerResponse?.data?.values?.[0]) {
        headers = headerResponse.data.values[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Event headers from first row:', headers);
      } else {
        // Fall back to using first row of data as header
        useFirstRowAsHeader = true;
        headers = rows[0].map((h: string) => 
          h ? String(h).toLowerCase().trim() : ''
        );
        console.log('Using first data row as event headers:', headers);
      }
      
      // Create expected header mappings
      const expectedHeaders = {
        id: ['id', 'event_id', 'eventid'],
        bookshopId: ['bookshopid', 'bookshop_id', 'store_id', 'bookstore_id', 'storeid', 'venue_id', 'location_id'],
        title: ['title', 'name', 'event_name', 'event_title'],
        description: ['description', 'desc', 'details', 'info', 'about'],
        date: ['date', 'event_date', 'day'],
        time: ['time', 'event_time', 'start_time', 'start']
      };
      
      // Create a mapping of expected field names to actual column indices
      const columnMap: Record<string, number> = {};
      
      // Map each field to its column index
      Object.entries(expectedHeaders).forEach(([field, possibleNames]) => {
        // Find first matching header
        const columnIndex = headers.findIndex(header => 
          possibleNames.includes(header)
        );
        
        if (columnIndex !== -1) {
          columnMap[field] = columnIndex;
        }
      });
      
      // If no proper mapping was found, fallback to positional mapping
      if (Object.keys(columnMap).length < 4) { // At least need id, bookshopId, title, description
        console.log('Insufficient event header mapping, falling back to positional mapping');
        columnMap.id = 0;
        columnMap.bookshopId = 1;
        columnMap.title = 2;
        columnMap.description = 3;
        columnMap.date = 4;
        columnMap.time = 5;
      }
      
      console.log('Event field to column mapping:', columnMap);

      // Convert rows to Event objects
      const startIndex = useFirstRowAsHeader ? 1 : 0;
      const events: Event[] = rows.slice(startIndex).map((row, rowIndex) => {
        try {
          // Skip empty or invalid rows
          if (!row || row.length < 3) { // Need at least id, bookshopId, title
            return null;
          }
          
          // Helper function to get values by field name
          const getValue = (field: string): string => {
            const index = columnMap[field];
            return index !== undefined && index < row.length ? String(row[index] || '') : '';
          };
          
          const id = parseInt(getValue('id') || '0');
          const bookshopId = parseInt(getValue('bookshopId') || '0');
          const title = getValue('title') || '';
          const description = getValue('description') || '';
          const date = getValue('date') || '';
          const time = getValue('time') || '';

          return {
            id,
            bookshopId,
            title,
            description,
            date,
            time,
          };
        } catch (error) {
          console.error(`Error processing event at row ${rowIndex + startIndex + 1}:`, error);
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