import { IStorage } from './storage';
import { Bookstore, Feature, Event, InsertBookstore, InsertFeature, InsertEvent, User, InsertUser } from '@shared/schema';
import { getGoogleSheetsService } from './google-sheets';

export class GoogleSheetsStorage implements IStorage {
  private bookstores: Bookstore[] = [];
  private features: Feature[] = [];
  private events: Event[] = [];
  private users: Map<number, User> = new Map();
  private slugToBookstoreId: Map<string, number> = new Map(); // Map slugs to bookstore IDs
  private userIdCounter: number = 1;
  private isInitialized: boolean = false;
  
  // Helper function to generate clean slugs from names
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();                  // Trim leading/trailing spaces
  }
  
  constructor() {
    this.initialize();
  }
  
  private async initialize() {
    try {
      console.log('Initializing Google Sheets storage...');
      await this.loadData();
      this.isInitialized = true;
      console.log('Google Sheets storage initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets storage:', error);
    }
  }
  
  private async loadData() {
    // Check if we should use sample data
    const useSampleData = process.env.USE_SAMPLE_DATA === 'true';
    
    if (useSampleData) {
      console.log('Using sample data (as configured by USE_SAMPLE_DATA)');
      this.initializeFeatures();
      this.initializeBookstores();
      this.initializeEvents();
      
      // Initialize slug mappings for fast bookshop lookups
      this.initializeSlugMappings();
      
      console.log(`Loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events from sample data`);
      return;
    }
    
    console.log('Attempting to load data from Google Sheets...');
    
    try {
      try {
        // Try to get Google Sheets service (may fail if credentials are missing)
        console.log('Getting Google Sheets service...');
        const googleSheetsService = getGoogleSheetsService();
        console.log('Google Sheets service obtained successfully');
        
        // Try to load data from Google Sheets
        console.log('Fetching data from Google Sheets...');
        const [bookstores, features, events] = await Promise.all([
          googleSheetsService.getBookstores(),
          googleSheetsService.getFeatures(),
          googleSheetsService.getEvents()
        ]);
        
        console.log(`Fetched ${bookstores.length} bookstores, ${features.length} features, ${events.length} events from Google Sheets`);
        
        // Check if we got any bookstores
        if (bookstores.length === 0) {
          console.warn('⚠️  WARNING: No bookstores were returned from Google Sheets. This might indicate:');
          console.warn('  1. The spreadsheet is empty');
          console.warn('  2. All rows were filtered out (e.g., due to error values)');
          console.warn('  3. The range is incorrect');
          console.warn('  4. The service account does not have access to the spreadsheet');
        }
        
        this.bookstores = bookstores;
        
        // If no features found, initialize with sample features
        if (features.length === 0) {
          console.log('No features found in Google Sheets, using sample features');
          this.initializeFeatures();
        } else {
          this.features = features;
        }
        
        // If no events found, initialize with sample events if needed
        if (events.length === 0) {
          console.log('No events found in Google Sheets, using sample events');
          this.initializeEvents();
        } else {
          this.events = events;
        }
        
        // Initialize slug mappings for SEO-friendly URLs
        this.initializeSlugMappings();
        
        console.log(`Successfully loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events (with supplements from sample data if needed)`);
      } catch (googleError) {
        console.error('Error loading from Google Sheets, falling back to sample data:');
        console.error('Error type:', googleError instanceof Error ? googleError.constructor.name : typeof googleError);
        console.error('Error message:', googleError instanceof Error ? googleError.message : String(googleError));
        if (googleError instanceof Error && googleError.stack) {
          console.error('Error stack:', googleError.stack);
        }
        
        // Fallback to sample data if Google Sheets fails
        this.initializeFeatures();
        this.initializeBookstores();
        this.initializeEvents();
        
        console.log(`Loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events from sample data`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  // Helper method to ensure data is loaded
  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  
  // Initialize the slug mappings for fast URL-friendly lookups
  private initializeSlugMappings() {
    console.log('Initializing bookshop slug mappings...');
    this.slugToBookstoreId.clear();
    
    // Process all bookshops to create slug mappings
    let duplicatesFound = 0;
    
    this.bookstores.forEach(bookstore => {
      if (bookstore.live !== false) { // Only create mappings for live bookshops
        const slug = this.generateSlugFromName(bookstore.name);
        
        // Log if we're overwriting an existing slug (duplicate handling)
        if (this.slugToBookstoreId.has(slug)) {
          duplicatesFound++;
          const existingId = this.slugToBookstoreId.get(slug);
          const existingStore = this.bookstores.find(b => b.id === existingId);
          console.log(`Duplicate slug "${slug}" detected. Previous: "${existingStore?.name}" (ID: ${existingId}), New: "${bookstore.name}" (ID: ${bookstore.id})`);
        }
        
        // Always set the mapping - in case of duplicates, last one wins
        // This keeps URLs clean with just the bookshop name
        this.slugToBookstoreId.set(slug, bookstore.id);
      }
    });
    
    if (duplicatesFound > 0) {
      console.log(`Found ${duplicatesFound} duplicate slugs. In cases of duplicates, the last bookshop with that slug will be used.`);
    }
    
    console.log(`Created ${this.slugToBookstoreId.size} slug mappings for bookshops`);
  }
  
  // User operations - stored in memory only
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id, favorites: [] };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserFavorites(userId: number, favorites: string[]): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.favorites = favorites;
    this.users.set(userId, user);
    return user;
  }
  
  // Bookstore operations - filter for live bookstores
  async getBookstores(): Promise<Bookstore[]> {
    const startTime = Date.now();
    await this.ensureInitialized();
    // Only return bookstores where live is not explicitly set to false
    const result = this.bookstores.filter(b => b.live !== false);
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.log(`[PERF] GoogleSheetsStorage.getBookstores: ${result.length} bookstores in ${duration}ms (slow)`);
    }
    return result;
  }
  
  async getBookstore(id: number): Promise<Bookstore | undefined> {
    await this.ensureInitialized();
    return this.bookstores.find(b => b.id === id);
  }
  
  async getBookstoreBySlug(slug: string): Promise<Bookstore | undefined> {
    await this.ensureInitialized();
    
    console.log(`Looking up bookstore with slug: ${slug}`);
    
    // Check if we already have this slug mapped
    const bookstoreId = this.slugToBookstoreId.get(slug);
    
    if (bookstoreId) {
      // Find the bookstore with this ID
      const bookstore = this.bookstores.find(b => b.id === bookstoreId);
      console.log(`Found bookstore by slug map: "${bookstore?.name}" (ID: ${bookstoreId})`);
      return bookstore;
    }
    
    // Fallback - if no mapping exists, try direct search
    console.log(`No slug mapping for "${slug}", trying direct lookup`);
    const bookstoreWithSlug = this.bookstores.find(b => {
      const nameSlug = this.generateSlugFromName(b.name);
      return nameSlug === slug;
    });
    
    if (bookstoreWithSlug) {
      console.log(`Found bookstore by direct search: "${bookstoreWithSlug.name}" (ID: ${bookstoreWithSlug.id})`);
      // Add to map for future lookups
      this.slugToBookstoreId.set(slug, bookstoreWithSlug.id);
    } else {
      console.log(`No bookstore found with slug: ${slug}`);
    }
    
    return bookstoreWithSlug;
  }
  
  async getBookstoresByState(state: string): Promise<Bookstore[]> {
    await this.ensureInitialized();
    return this.bookstores.filter(b => 
      b.live !== false && 
      b.state === state
    );
  }
  
  async getBookstoresByCity(city: string): Promise<Bookstore[]> {
    await this.ensureInitialized();
    return this.bookstores.filter(b => 
      b.live !== false && 
      b.city === city
    );
  }
  
  async getBookstoresByFeatures(featureIds: number[]): Promise<Bookstore[]> {
    await this.ensureInitialized();
    return this.bookstores.filter(bookstore => 
      bookstore.live !== false &&
      (bookstore.featureIds?.some(id => featureIds.includes(id)) || false)
    );
  }
  
  // Helper method to normalize state names to abbreviations
  private normalizeStateName(stateName: string): string {
    const stateMap: {[key: string]: string} = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
      'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
      'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
      'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
      'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
      'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
      'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
      'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
      'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
      'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
      'wisconsin': 'WI', 'wyoming': 'WY',
      'british columbia': 'BC', 'ontario': 'ON', 'quebec': 'QC', 'alberta': 'AB',
      'manitoba': 'MB', 'nova scotia': 'NS', 'new brunswick': 'NB', 'saskatchewan': 'SK'
    };
    
    const normalized = stateName.toLowerCase().trim();
    return stateMap[normalized] || stateName.toUpperCase();
  }

  async getFilteredBookstores(filters: { state?: string, city?: string, county?: string, featureIds?: number[] }): Promise<Bookstore[]> {
    const startTime = Date.now();
    await this.ensureInitialized();
    // Start with only live bookstores
    let filteredBookstores = this.bookstores.filter(b => b.live !== false);
    
    if (filters.state) {
      // Fuzzy state matching: handles abbreviations, full names, and case variations
      const filterState = filters.state.trim();
      const normalizedFilterState = filterState.length === 2 
        ? filterState.toUpperCase() 
        : this.normalizeStateName(filterState);
      
      filteredBookstores = filteredBookstores.filter(b => {
        if (!b.state) return false;
        const bookshopState = b.state.trim();
        const normalizedBookshopState = bookshopState.length === 2
          ? bookshopState.toUpperCase()
          : this.normalizeStateName(bookshopState);
        return normalizedBookshopState === normalizedFilterState;
      });
    }
    
    if (filters.city) {
      // Case-insensitive city matching
      const normalizedCity = filters.city.toLowerCase().trim();
      filteredBookstores = filteredBookstores.filter(b => {
        if (!b.city) return false;
        return b.city.toLowerCase().trim() === normalizedCity;
      });
    }
    
    if (filters.county) {
      // Fuzzy county matching: handles "County" suffix and case variations
      const normalizedCounty = filters.county.toLowerCase().trim().replace(/\s+county$/i, '');
      filteredBookstores = filteredBookstores.filter(b => {
        if (!b.county) return false;
        const bookshopCounty = b.county.toLowerCase().trim().replace(/\s+county$/i, '');
        // Exact match or partial match for flexibility
        return bookshopCounty === normalizedCounty ||
               bookshopCounty.includes(normalizedCounty) ||
               normalizedCounty.includes(bookshopCounty);
      });
    }
    
    if (filters.featureIds && filters.featureIds.length > 0) {
      filteredBookstores = filteredBookstores.filter(bookstore => 
        bookstore.featureIds?.some(id => filters.featureIds?.includes(id)) || false
      );
    }
    
    const duration = Date.now() - startTime;
    if (duration > 50) {
      const filterDesc = Object.entries(filters)
        .filter(([_, v]) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true))
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
        .join(', ') || 'none';
      console.log(`[PERF] GoogleSheetsStorage.getFilteredBookstores (${filterDesc}): ${filteredBookstores.length} results in ${duration}ms`);
    }
    
    return filteredBookstores;
  }

  async getAllCounties(): Promise<string[]> {
    await this.ensureInitialized();
    
    // Extract unique county values from bookstores
    const counties = new Set<string>();
    
    this.bookstores
      .filter(bookstore => bookstore.live !== false)
      .forEach(bookstore => {
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        if (bookstore.county && bookstore.county.trim() !== '') {
          counties.add(bookstore.county);
        }
      });
    
    return Array.from(counties).sort();
  }

  async getCountiesByState(state: string): Promise<string[]> {
    await this.ensureInitialized();
    
    // Extract unique county values for the given state
    const counties = new Set<string>();
    const normalizedState = state.trim();
    
    this.bookstores
      .filter(bookstore => 
        bookstore.live !== false && 
        bookstore.state && 
        bookstore.state.trim().toLowerCase() === normalizedState.toLowerCase()
      )
      .forEach(bookstore => {
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        if (bookstore.county && bookstore.county.trim() !== '') {
          counties.add(bookstore.county);
        }
      });
    
    return Array.from(counties).sort();
  }
  
  // Not implemented for read-only integration
  async createBookstore(bookstore: InsertBookstore): Promise<Bookstore> {
    throw new Error('Creating bookstores not supported in this integration');
  }
  
  // Feature operations - from sample data for now
  async getFeatures(): Promise<Feature[]> {
    await this.ensureInitialized();
    return this.features;
  }
  
  async getFeature(id: number): Promise<Feature | undefined> {
    await this.ensureInitialized();
    return this.features.find(f => f.id === id);
  }
  
  // Not implemented for read-only integration
  async createFeature(feature: InsertFeature): Promise<Feature> {
    throw new Error('Creating features not supported in this integration');
  }
  
  // Event operations - from sample data for now
  async getEvents(): Promise<Event[]> {
    await this.ensureInitialized();
    return this.events;
  }
  
  async getEventsByBookshop(bookshopId: number): Promise<Event[]> {
    await this.ensureInitialized();
    return this.events.filter(e => e.bookshopId === bookshopId);
  }
  
  // Not implemented for read-only integration
  async createEvent(event: InsertEvent): Promise<Event> {
    throw new Error('Creating events not supported in this integration');
  }
  
  // Helper method to refresh data
  async refreshData(): Promise<void> {
    console.log('Refreshing data...');
    await this.loadData();
    console.log('Data refresh complete');
  }

  // Initialize sample data (this would eventually be replaced with actual Google Sheets integration)
  private initializeFeatures(): void {
    this.features = [
      { id: 1, name: 'Coffee Shop' },
      { id: 2, name: 'Used Books' },
      { id: 3, name: 'Rare Books' },
      { id: 4, name: 'Children\'s Section' },
      { id: 5, name: 'Author Events' },
      { id: 6, name: 'Open Mic Nights' },
      { id: 7, name: 'Book Clubs' },
      { id: 8, name: 'Wi-Fi' }
    ];
  }

  private initializeBookstores(): void {
    this.bookstores = [
      {
        id: 1,
        name: 'Book Haven',
        street: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zip: '97204',
        county: null,
        description: 'A cozy bookstore with a wide selection of fiction and non-fiction titles.',
        imageUrl: 'https://images.unsplash.com/photo-1521123845560-14093637aa7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        website: 'https://www.bookhaven.com',
        phone: '(503) 555-1234',
        hours: { 'Monday': '9am-6pm', 'Tuesday': '9am-6pm', 'Wednesday': '9am-6pm', 'Thursday': '9am-6pm', 'Friday': '9am-8pm', 'Saturday': '10am-8pm', 'Sunday': '11am-5pm' },
        latitude: '45.5231',
        longitude: '-122.6765',
        featureIds: [1, 4, 7, 8],
        live: true
      },
      {
        id: 2,
        name: 'The Reading Room',
        street: '456 Oak Ave',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
        county: null,
        description: 'A charming bookstore specializing in rare and first edition books.',
        imageUrl: 'https://images.unsplash.com/photo-1526243741027-444d633d7365?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        website: 'https://www.readingroom.com',
        phone: '(206) 555-5678',
        hours: { 'Monday': 'Closed', 'Tuesday': '10am-7pm', 'Wednesday': '10am-7pm', 'Thursday': '10am-7pm', 'Friday': '10am-9pm', 'Saturday': '10am-9pm', 'Sunday': '12pm-6pm' },
        latitude: '47.6062',
        longitude: '-122.3321',
        featureIds: [2, 3, 5],
        live: true
      },
      {
        id: 3,
        name: 'Page Turner Books',
        street: '789 Elm St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94110',
        county: null,
        description: 'A vibrant bookstore with a coffee shop and regular author events.',
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        website: 'https://www.pageturnerbooks.com',
        phone: '(415) 555-9012',
        hours: { 'Monday': '8am-8pm', 'Tuesday': '8am-8pm', 'Wednesday': '8am-8pm', 'Thursday': '8am-8pm', 'Friday': '8am-10pm', 'Saturday': '9am-10pm', 'Sunday': '9am-7pm' },
        latitude: '37.7749',
        longitude: '-122.4194',
        featureIds: [1, 4, 5, 6, 7, 8],
        live: false // This bookstore is not active
      },
      {
        id: 4,
        name: 'Literary Corner',
        street: '101 Pine St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        county: null,
        description: 'A community-focused bookstore with a large selection of local authors.',
        imageUrl: 'https://images.unsplash.com/photo-1533327325824-76bc4e62d560?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        website: 'https://www.literarycorner.com',
        phone: '(512) 555-3456',
        hours: { 'Monday': '10am-7pm', 'Tuesday': '10am-7pm', 'Wednesday': '10am-7pm', 'Thursday': '10am-7pm', 'Friday': '10am-9pm', 'Saturday': '10am-9pm', 'Sunday': '12pm-6pm' },
        latitude: '30.2672',
        longitude: '-97.7431',
        featureIds: [2, 5, 6, 7],
        live: true
      },
      {
        id: 5,
        name: 'Bookworm Paradise',
        street: '222 Cedar Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97205',
        county: null,
        description: 'A book lover\'s paradise with comfortable reading nooks and a tea bar.',
        imageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        website: 'https://www.bookwormparadise.com',
        phone: '(503) 555-7890',
        hours: { 'Monday': '7am-7pm', 'Tuesday': '7am-7pm', 'Wednesday': '7am-7pm', 'Thursday': '7am-7pm', 'Friday': '7am-9pm', 'Saturday': '8am-9pm', 'Sunday': '8am-7pm' },
        latitude: '45.5234',
        longitude: '-122.6762',
        featureIds: [1, 2, 4, 8],
        live: true
      }
    ];
  }

  private initializeEvents(): void {
    this.events = [
      {
        id: 1,
        bookshopId: 1,
        title: 'Meet the Author: Jane Smith',
        description: 'Jane Smith will be discussing her new novel "The Silent Echo".',
        date: '2025-05-15',
        time: '7:00 PM'
      },
      {
        id: 2,
        bookshopId: 1,
        title: 'Children\'s Story Hour',
        description: 'Join us for a magical hour of storytelling for kids ages 4-8.',
        date: '2025-05-18',
        time: '10:30 AM'
      },
      {
        id: 3,
        bookshopId: 2,
        title: 'Poetry Reading Night',
        description: 'Local poets share their latest works in an intimate setting.',
        date: '2025-05-20',
        time: '6:30 PM'
      },
      {
        id: 4,
        bookshopId: 3,
        title: 'Book Club: "The Midnight Library"',
        description: 'Discussion of Matt Haig\'s bestselling novel.',
        date: '2025-05-25',
        time: '7:00 PM'
      },
      {
        id: 5,
        bookshopId: 3,
        title: 'Coffee & Classics',
        description: 'A morning discussion of classic literature over fresh coffee.',
        date: '2025-05-16',
        time: '9:00 AM'
      },
      {
        id: 6,
        bookshopId: 4,
        title: 'Local Author Showcase',
        description: 'Featuring five Austin-based authors and their recent publications.',
        date: '2025-05-22',
        time: '6:00 PM'
      },
      {
        id: 7,
        bookshopId: 5,
        title: 'Young Writers Workshop',
        description: 'A creative writing workshop for teens interested in storytelling.',
        date: '2025-05-19',
        time: '4:00 PM'
      }
    ];
  }
}