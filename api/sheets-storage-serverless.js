// Serverless-compatible version of the sheets storage for Vercel deployment
import { googleSheetsService } from './google-sheets-serverless.js';

export class GoogleSheetsStorage {
  constructor() {
    this.bookstores = [];
    this.features = [];
    this.events = [];
    this.users = new Map();
    this.userIdCounter = 1;
    this.isInitialized = false;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      console.log('Serverless: Initializing Google Sheets storage...');
      await this.loadData();
      this.isInitialized = true;
      console.log('Serverless: Google Sheets storage initialized successfully');
    } catch (error) {
      console.error('Serverless: Error initializing Google Sheets storage:', error);
    }
  }
  
  async loadData() {
    console.log('Serverless: Attempting to load data from Google Sheets...');
    
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
          console.log('Serverless: No features found in Google Sheets, using sample features');
          this.initializeFeatures();
        } else {
          this.features = features;
        }
        
        // If no events found, initialize with sample events if needed
        if (events.length === 0) {
          console.log('Serverless: No events found in Google Sheets, using sample events');
          this.initializeEvents();
        } else {
          this.events = events;
        }
        
        console.log(`Serverless: Successfully loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events`);
      } catch (googleError) {
        console.error('Serverless: Error loading from Google Sheets, falling back to sample data:', googleError);
        
        // Fallback to sample data if Google Sheets fails
        this.initializeFeatures();
        this.initializeBookstores();
        this.initializeEvents();
        
        console.log(`Serverless: Loaded ${this.bookstores.length} bookstores, ${this.features.length} features, and ${this.events.length} events from sample data`);
      }
    } catch (error) {
      console.error('Serverless: Error loading data:', error);
      throw error;
    }
  }
  
  // Helper method to ensure data is loaded
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  
  // User operations - stored in memory only
  async getUser(id) {
    await this.ensureInitialized();
    return this.users.get(id);
  }
  
  async getUserByUsername(username) {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user) {
    await this.ensureInitialized();
    const id = this.userIdCounter++;
    const newUser = { ...user, id, favorites: [] };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserFavorites(userId, favorites) {
    await this.ensureInitialized();
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.favorites = favorites;
    this.users.set(userId, user);
    return user;
  }
  
  // Bookstore operations - filter for live bookstores
  async getBookstores() {
    await this.ensureInitialized();
    // Only return bookstores where live is not explicitly set to false
    return this.bookstores.filter(b => b.live !== false);
  }
  
  async getBookstore(id) {
    await this.ensureInitialized();
    return this.bookstores.find(b => b.id === id);
  }
  
  async getBookstoresByState(state) {
    await this.ensureInitialized();
    return this.bookstores.filter(b => 
      b.live !== false && 
      b.state === state
    );
  }
  
  async getBookstoresByCity(city) {
    await this.ensureInitialized();
    return this.bookstores.filter(b => 
      b.live !== false && 
      b.city === city
    );
  }
  
  async getBookstoresByFeatures(featureIds) {
    await this.ensureInitialized();
    return this.bookstores.filter(bookstore => 
      bookstore.live !== false &&
      (bookstore.featureIds?.some(id => featureIds.includes(id)) || false)
    );
  }
  
  async getFilteredBookstores(filters) {
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
  async createBookstore(bookstore) {
    throw new Error('Creating bookstores not supported in this integration');
  }
  
  // Feature operations
  async getFeatures() {
    await this.ensureInitialized();
    return this.features;
  }
  
  async getFeature(id) {
    await this.ensureInitialized();
    return this.features.find(f => f.id === id);
  }
  
  // Not implemented for read-only integration
  async createFeature(feature) {
    throw new Error('Creating features not supported in this integration');
  }
  
  // Event operations
  async getEvents() {
    await this.ensureInitialized();
    return this.events;
  }
  
  async getEventsByBookshop(bookshopId) {
    await this.ensureInitialized();
    return this.events.filter(e => e.bookshopId === bookshopId);
  }
  
  // Not implemented for read-only integration
  async createEvent(event) {
    throw new Error('Creating events not supported in this integration');
  }
  
  // Helper method to refresh data
  async refreshData() {
    console.log('Serverless: Refreshing data...');
    await this.loadData();
    console.log('Serverless: Data refresh complete');
  }

  // Initialize sample data - fallbacks for if Google Sheets fails
  initializeFeatures() {
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

  initializeBookstores() {
    // Just a placeholder empty array - we don't want to load sample bookstores in production
    this.bookstores = [];
  }

  initializeEvents() {
    // Just a placeholder empty array
    this.events = [];
  }
}