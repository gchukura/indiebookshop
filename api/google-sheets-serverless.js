// Serverless-compatible version of Google Sheets service
import { google } from 'googleapis';

// Get spreadsheet ID from environment variable
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Default configuration
const DEFAULT_CONFIG = {
  spreadsheetId: SPREADSHEET_ID,
  bookshopRange: 'Bookstores!A2:O',
  featuresRange: 'Features!A2:B',
  eventsRange: 'Events!A2:F'
};

class GoogleSheetsService {
  constructor(config = DEFAULT_CONFIG) {
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
          
          console.log('Serverless: Google Sheets service initialized with service account credentials');
        } catch (credError) {
          console.error('Serverless: Error parsing credentials:', credError);
          throw credError;
        }
      } else {
        console.error('Serverless: No Google service account credentials found');
        throw new Error('Google service account credentials are required');
      }
      
      console.log('Serverless: Google Sheets service initialized');
    } catch (error) {
      console.error('Serverless: Error initializing Google Sheets service:', error);
      throw error;
    }
  }

  // First get the header row to create a column mapping
  async #getHeaderRow() {
    try {
      // First get the header row (A1:P1)
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'Bookstores!A1:P1',
      });
      
      // Check if header row exists
      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        console.error('Serverless: Header row not found');
        return null;
      }
      
      const headers = headerResponse.data.values[0].map(h => h.toLowerCase());
      console.log('Serverless: Headers from first row:', headers);
      
      // Create mapping of field names to column indices
      const fieldToColumn = {
        id: headers.indexOf('id'),
        name: headers.indexOf('name'),
        street: headers.indexOf('street'),
        city: headers.indexOf('city'),
        state: headers.indexOf('state'),
        zip: headers.indexOf('zip'),
        county: headers.indexOf('county'), // Add county field
        description: headers.indexOf('description'),
        imageUrl: headers.indexOf('imageurl'),
        website: headers.indexOf('website'),
        phone: headers.indexOf('phone'),
        // hours might be "hours" or "hours (json)"
        hours: headers.findIndex(h => h.startsWith('hours')),
        latitude: headers.indexOf('latitude'),
        longitude: headers.indexOf('longitude'),
        // featureIds might be "featureids" or "featureids (comma-seperated)"
        featureIds: headers.findIndex(h => h.startsWith('featureid')),
        live: headers.indexOf('live')
      };
      
      console.log('Serverless: Field to column mapping:', fieldToColumn);
      return fieldToColumn;
    } catch (error) {
      console.error('Serverless: Error fetching header row:', error);
      return null;
    }
  }

  // Fetch all bookshops from the Google Sheet
  async getBookstores() {
    try {
      // First get the field to column mapping
      const fieldToColumn = await this.#getHeaderRow();
      
      if (!fieldToColumn) {
        console.error('Serverless: Could not determine column structure');
        return [];
      }
      
      console.log(`Serverless: Fetching bookshops from Google Sheets range: ${this.config.bookshopRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.bookshopRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('Serverless: No bookshop data found in the spreadsheet');
        return [];
      }

      // Convert rows to Bookstore objects using the field mapping
      const bookshops = rows.map((row, index) => {
        try {
          // Use field mapping to extract data
          const id = parseInt(row[fieldToColumn.id] || '0');
          const name = row[fieldToColumn.name] || '';
          const street = row[fieldToColumn.street] || '';
          const city = row[fieldToColumn.city] || '';
          const state = row[fieldToColumn.state] || '';
          const zip = row[fieldToColumn.zip] || '';
          const county = row[fieldToColumn.county] || null; // Get county field
          const description = row[fieldToColumn.description] || '';
          const imageUrl = row[fieldToColumn.imageUrl] || null;
          const website = row[fieldToColumn.website] || null;
          const phone = row[fieldToColumn.phone] || null;
          
          // Parse hours (if provided in JSON format)
          let hours = null;
          try {
            if (fieldToColumn.hours >= 0 && row[fieldToColumn.hours]) {
              hours = JSON.parse(row[fieldToColumn.hours]);
            }
          } catch (e) {
            console.error(`Serverless: Error parsing hours for bookshop ${id}:`, e);
          }

          const latitude = fieldToColumn.latitude >= 0 ? row[fieldToColumn.latitude] || null : null;
          const longitude = fieldToColumn.longitude >= 0 ? row[fieldToColumn.longitude] || null : null;
          
          // Parse feature IDs (comma-separated string of IDs)
          let featureIds = null;
          try {
            if (fieldToColumn.featureIds >= 0 && row[fieldToColumn.featureIds]) {
              featureIds = row[fieldToColumn.featureIds].split(',').map((idStr) => parseInt(idStr.trim()));
            }
          } catch (e) {
            console.error(`Serverless: Error parsing featureIds for bookshop ${id}:`, e);
          }
          
          // Parse live status (default to true if not provided)
          let live = true;
          try {
            if (fieldToColumn.live >= 0 && row[fieldToColumn.live] !== undefined) {
              // Convert various string formats to boolean
              const liveStr = String(row[fieldToColumn.live]).trim().toLowerCase();
              live = liveStr === 'yes' || liveStr === 'true' || liveStr === '1';
            }
          } catch (e) {
            console.error(`Serverless: Error parsing live status for bookshop ${id}:`, e);
          }

          return {
            id,
            name,
            street,
            city,
            state,
            zip,
            county, // Include county in returned object
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
          console.error(`Serverless: Error processing bookshop row ${index}:`, error);
          return null;
        }
      }).filter(Boolean);

      console.log(`Serverless: Retrieved ${bookshops.length} bookshops from Google Sheets`);
      return bookshops;
    } catch (error) {
      console.error('Serverless: Error fetching bookshops from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch all features from the Google Sheet
  async getFeatures() {
    try {
      console.log(`Serverless: Fetching features from Google Sheets range: ${this.config.featuresRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.featuresRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('Serverless: No feature data found in the spreadsheet');
        return [];
      }

      // Convert rows to Feature objects
      const features = rows.map((row, index) => {
        try {
          // Assuming columns are in this order: id, name
          const id = parseInt(row[0] || '0');
          const name = row[1] || '';

          return { id, name };
        } catch (error) {
          console.error(`Serverless: Error processing feature row ${index}:`, error);
          return null;
        }
      }).filter(Boolean);

      console.log(`Serverless: Retrieved ${features.length} features from Google Sheets`);
      return features;
    } catch (error) {
      console.error('Serverless: Error fetching features from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch all events from the Google Sheet
  async getEvents() {
    try {
      console.log(`Serverless: Fetching events from Google Sheets range: ${this.config.eventsRange}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.eventsRange,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('Serverless: No event data found in the spreadsheet');
        return [];
      }

      // Expected column structure: id, bookshopId, title, description, date, time
      const events = rows.map((row, index) => {
        try {
          if (row.length < 4) {
            console.warn(`Serverless: Row ${index} has insufficient data, skipping`);
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
          console.error(`Serverless: Error processing event row ${index}:`, error);
          return null;
        }
      }).filter(Boolean);

      console.log(`Serverless: Retrieved ${events.length} events from Google Sheets`);
      return events;
    } catch (error) {
      console.error('Serverless: Error fetching events from Google Sheets:', error);
      throw error;
    }
  }

  // Fetch events for a specific bookshop
  async getEventsByBookshop(bookshopId) {
    const allEvents = await this.getEvents();
    return allEvents.filter(event => event.bookshopId === bookshopId);
  }
}

// Create and export a singleton instance
export const googleSheetsService = new GoogleSheetsService();