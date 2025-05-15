import { IStorage } from './storage';
import { Bookstore, Feature, Event, InsertBookstore, InsertFeature, InsertEvent, User, InsertUser } from '@shared/schema';
import { googleSheetsService } from './google-sheets';

export class GoogleSheetsStorage implements IStorage {
  private bookstores: Bookstore[] = [];
  private features: Feature[] = [];
  private events: Event[] = [];
  private users: Map<number, User> = new Map();
  private userIdCounter: number = 1;
  private isInitialized: boolean = false;
  
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
      console.log(`Loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events from sample data`);
      return;
    }
    
    console.log('Attempting to load data from Google Sheets...');
    
    try {
      try {
        // Try to load data from Google Sheets
        const [bookstores, features, events] = await Promise.all([
          googleSheetsService.getBookstores(),
          googleSheetsService.getFeatures(),
          googleSheetsService.getEvents()
        ]);
        
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
        
        console.log(`Successfully loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events (with supplements from sample data if needed)`);
      } catch (googleError) {
        console.error('Error loading from Google Sheets, falling back to sample data:', googleError);
        
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
    await this.ensureInitialized();
    // Only return bookstores where live is not explicitly set to false
    return this.bookstores.filter(b => b.live !== false);
  }
  
  async getBookstore(id: number): Promise<Bookstore | undefined> {
    await this.ensureInitialized();
    return this.bookstores.find(b => b.id === id);
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
  
  async getFilteredBookstores(filters: { state?: string, city?: string, featureIds?: number[] }): Promise<Bookstore[]> {
    await this.ensureInitialized();
    // Start with only live bookstores
    let filteredBookstores = this.bookstores.filter(b => b.live !== false);
    
    if (filters.state) {
      filteredBookstores = filteredBookstores.filter(b => b.state === filters.state);
    }
    
    if (filters.city) {
      filteredBookstores = filteredBookstores.filter(b => b.city === filters.city);
    }
    
    if (filters.featureIds && filters.featureIds.length > 0) {
      filteredBookstores = filteredBookstores.filter(bookstore => 
        bookstore.featureIds?.some(id => filters.featureIds?.includes(id)) || false
      );
    }
    
    return filteredBookstores;
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