import { 
  users, type User, type InsertUser,
  bookstores, type Bookstore, type InsertBookstore,
  features, type Feature, type InsertFeature,
  events, type Event, type InsertEvent
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFavorites(userId: number, favorites: string[]): Promise<User | undefined>;
  
  // Bookstore operations
  getBookstores(): Promise<Bookstore[]>;
  getBookstore(id: number): Promise<Bookstore | undefined>;
  getBookstoreBySlug(slug: string): Promise<Bookstore | undefined>;
  getBookstoresByState(state: string): Promise<Bookstore[]>;
  getBookstoresByCity(city: string): Promise<Bookstore[]>;
  getBookstoresByCounty(county: string): Promise<Bookstore[]>; // New: Get bookstores by county
  getBookstoresByCountyState(county: string, state: string): Promise<Bookstore[]>; // New: Get bookstores by county and state
  getBookstoresByFeatures(featureIds: number[]): Promise<Bookstore[]>;
  getFilteredBookstores(filters: { state?: string, city?: string, county?: string, featureIds?: number[] }): Promise<Bookstore[]>;
  createBookstore(bookstore: InsertBookstore): Promise<Bookstore>;
  
  // County operations
  getAllCounties(): Promise<string[]>; // New: Get all counties
  getCountiesByState(state: string): Promise<string[]>; // New: Get counties by state
  
  // Feature operations
  getFeatures(): Promise<Feature[]>;
  getFeature(id: number): Promise<Feature | undefined>;
  createFeature(feature: InsertFeature): Promise<Feature>;
  
  // Event operations
  getEvents(): Promise<Event[]>;
  getEventsByBookshop(bookshopId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookstores: Map<number, Bookstore>;
  private features: Map<number, Feature>;
  private events: Map<number, Event>;
  private slugToBookstoreId: Map<string, number>; // For fast slug-based lookups
  
  private userCurrentId: number;
  private bookstoreCurrentId: number;
  private featureCurrentId: number;
  private eventCurrentId: number;

  constructor() {
    this.users = new Map();
    this.bookstores = new Map();
    this.features = new Map();
    this.events = new Map();
    this.slugToBookstoreId = new Map();
    
    this.userCurrentId = 1;
    this.bookstoreCurrentId = 1;
    this.featureCurrentId = 1;
    this.eventCurrentId = 1;
    
    // Initialize with some features
    this.initializeFeatures();
    // Initialize with some bookstores
    this.initializeBookstores();
    // Initialize with some events
    this.initializeEvents();
    
    // Generate slug mappings after all bookstores are loaded
    this.initializeSlugMappings();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id, favorites: [] };
    this.users.set(id, user);
    return user;
  }

  async updateUserFavorites(userId: number, favorites: string[]): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, favorites };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Bookstore methods
  async getBookstores(): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => bookstore.live !== false // Show all bookstores except those explicitly marked as not live
    );
  }

  async getBookstore(id: number): Promise<Bookstore | undefined> {
    const bookstore = this.bookstores.get(id);
    // Individual bookstore can be viewed even if not live (for admin/preview purposes)
    return bookstore;
  }
  
  async getBookstoreBySlug(slug: string): Promise<Bookstore | undefined> {
    try {
      console.log(`Looking up bookstore with slug: ${slug}`);
      
      // Fast lookup using our slug mapping
      const bookstoreId = this.slugToBookstoreId.get(slug);
      
      if (bookstoreId) {
        // We found a matching bookstore in our mapping
        const bookstore = this.bookstores.get(bookstoreId);
        console.log(`Found bookstore by slug: "${bookstore?.name}" (ID: ${bookstoreId})`);
        return bookstore;
      }
      
      console.log(`No bookstore found with slug: ${slug}`);
      return undefined;
    } catch (error) {
      console.error("Error in getBookstoreBySlug:", error);
      // Re-throw the error so it can be caught by the route handler
      throw error;
    }
  }
  
  // Helper function to generate a slug from a name
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
      .trim();                  // Trim leading/trailing spaces
  }
  
  // Initialize our slug mapping system for fast lookups
  private initializeSlugMappings(): void {
    console.log('Initializing bookshop slug mappings...');
    this.slugToBookstoreId.clear();
    
    // Process all bookshops
    Array.from(this.bookstores.values()).forEach(bookstore => {
      if (bookstore.live !== false) { // Only create mappings for live bookshops
        const slug = this.generateSlugFromName(bookstore.name);
        
        // Log only if this is overwriting an existing slug
        if (this.slugToBookstoreId.has(slug)) {
          const existingId = this.slugToBookstoreId.get(slug);
          const existingStore = this.bookstores.get(existingId!);
          console.log(`Duplicate slug "${slug}" detected. Previous: "${existingStore?.name}" (ID: ${existingId}), New: "${bookstore.name}" (ID: ${bookstore.id})`);
        }
        
        // Always set the mapping - in case of duplicates, last one wins
        // This keeps URLs clean with just the bookshop name
        this.slugToBookstoreId.set(slug, bookstore.id);
      }
    });
    
    console.log(`Created ${this.slugToBookstoreId.size} slug mappings for bookshops`);
  }

  async getBookstoresByState(state: string): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => 
        bookstore.live !== false && // Only show live bookstores
        bookstore.state.toLowerCase() === state.toLowerCase()
    );
  }

  async getBookstoresByCity(city: string): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => 
        bookstore.live !== false && // Only show live bookstores
        bookstore.city.toLowerCase() === city.toLowerCase()
    );
  }

  async getBookstoresByFeatures(featureIds: number[]): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => 
        bookstore.live !== false && // Only show live bookstores
        bookstore.featureIds && bookstore.featureIds.some(id => featureIds.includes(id))
    );
  }

  async getFilteredBookstores(filters: { state?: string, city?: string, county?: string, featureIds?: number[] }): Promise<Bookstore[]> {
    let filteredBookstores = Array.from(this.bookstores.values()).filter(
      (bookstore) => bookstore.live !== false // Only show live bookstores
    );
    
    if (filters.state) {
      filteredBookstores = filteredBookstores.filter(
        (bookstore) => bookstore.state.toLowerCase() === filters.state!.toLowerCase()
      );
    }
    
    if (filters.city) {
      filteredBookstores = filteredBookstores.filter(
        (bookstore) => bookstore.city.toLowerCase() === filters.city!.toLowerCase()
      );
    }
    
    if (filters.county) {
      filteredBookstores = filteredBookstores.filter(
        (bookstore) => {
          // @ts-ignore - county field exists in data but might not be fully added to type yet
          return bookstore.county && bookstore.county.toLowerCase() === filters.county!.toLowerCase();
        }
      );
    }
    
    if (filters.featureIds && filters.featureIds.length > 0) {
      filteredBookstores = filteredBookstores.filter(
        (bookstore) => bookstore.featureIds?.some(id => filters.featureIds!.includes(id)) || false
      );
    }
    
    return filteredBookstores;
  }
  
  // County operations
  async getBookstoresByCounty(county: string): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => 
        bookstore.live !== false && // Only show live bookstores
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        bookstore.county && bookstore.county.toLowerCase() === county.toLowerCase()
    );
  }
  
  async getBookstoresByCountyState(county: string, state: string): Promise<Bookstore[]> {
    return Array.from(this.bookstores.values()).filter(
      (bookstore) => 
        bookstore.live !== false && // Only show live bookstores
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        bookstore.county && 
        bookstore.county.toLowerCase() === county.toLowerCase() &&
        bookstore.state.toLowerCase() === state.toLowerCase()
    );
  }
  
  async getAllCounties(): Promise<string[]> {
    const counties = new Set<string>();
    
    Array.from(this.bookstores.values())
      .filter(bookstore => bookstore.live !== false) // Only include live bookstores
      .forEach(bookstore => {
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        if (bookstore.county && bookstore.county.trim() !== '') {
          counties.add(bookstore.county);
        }
      });
    
    return Array.from(counties).sort();
  }
  
  async getCountiesByState(state: string): Promise<string[]> {
    const counties = new Set<string>();
    
    Array.from(this.bookstores.values())
      .filter(bookstore => 
        bookstore.live !== false && // Only include live bookstores
        bookstore.state.toLowerCase() === state.toLowerCase()
      )
      .forEach(bookstore => {
        // @ts-ignore - county field exists in data but might not be fully added to type yet
        if (bookstore.county && bookstore.county.trim() !== '') {
          counties.add(bookstore.county);
        }
      });
    
    return Array.from(counties).sort();
  }

  async createBookstore(insertBookstore: InsertBookstore): Promise<Bookstore> {
    const id = this.bookstoreCurrentId++;
    const bookstore: Bookstore = { 
      id,
      name: insertBookstore.name,
      street: insertBookstore.street,
      city: insertBookstore.city,
      state: insertBookstore.state,
      zip: insertBookstore.zip,
      county: insertBookstore.county || null,
      description: insertBookstore.description,
      imageUrl: insertBookstore.imageUrl || null,
      website: insertBookstore.website || null,
      phone: insertBookstore.phone || null,
      hours: insertBookstore.hours || null,
      latitude: insertBookstore.latitude || null,
      longitude: insertBookstore.longitude || null,
      featureIds: insertBookstore.featureIds || null,
      live: insertBookstore.live || null
    };
    this.bookstores.set(id, bookstore);
    return bookstore;
  }

  // Feature methods
  async getFeatures(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    return this.features.get(id);
  }

  async createFeature(insertFeature: InsertFeature): Promise<Feature> {
    const id = this.featureCurrentId++;
    const feature: Feature = { ...insertFeature, id };
    this.features.set(id, feature);
    return feature;
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEventsByBookshop(bookshopId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.bookshopId === bookshopId
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventCurrentId++;
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  // Initialize sample data
  private initializeFeatures(): void {
    const featuresList = [
      { name: "Events" },
      { name: "Café" },
      { name: "Used Books" },
      { name: "Rare Books" },
      { name: "Children's Books" },
      { name: "Local Authors" },
      { name: "Art Books" },
      { name: "Book Club" }
    ];

    featuresList.forEach(feature => {
      this.createFeature(feature);
    });
  }

  private initializeBookstores(): void {
    const bookstoresList = [
      {
        name: "City Lights Bookstore",
        street: "261 Columbus Ave",
        city: "San Francisco",
        state: "CA",
        zip: "94133",
        description: "A landmark independent bookstore and publisher that specializes in world literature, the arts, and progressive politics.",
        imageUrl: "https://pixabay.com/get/gec91b5765bd43ce5dd52466e8296936e501e700c7191c327dd9884981052ab5f79a777a656f69b5e047931036f7af4dd4dbdec8c6d8c17920f65a6524ec42c64_1280.jpg",
        website: "http://www.citylights.com",
        phone: "(415) 362-8193",
        hours: { 
          "Monday": "10:00 AM - 6:00 PM",
          "Tuesday": "10:00 AM - 6:00 PM",
          "Wednesday": "10:00 AM - 6:00 PM",
          "Thursday": "10:00 AM - 6:00 PM",
          "Friday": "10:00 AM - 6:00 PM",
          "Saturday": "10:00 AM - 6:00 PM",
          "Sunday": "10:00 AM - 6:00 PM"
        },
        latitude: "37.7982",
        longitude: "-122.4067",
        featureIds: [1, 3, 6],
        live: true
      },
      {
        name: "Powell's Books",
        street: "1005 W Burnside St",
        city: "Portland",
        state: "OR",
        zip: "97209",
        description: "The world's largest independent bookstore, occupying an entire city block with more than a million new and used books.",
        imageUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        website: "http://www.powellsbooks.com",
        phone: "(503) 228-4651",
        hours: { 
          "Monday": "9:00 AM - 10:00 PM",
          "Tuesday": "9:00 AM - 10:00 PM",
          "Wednesday": "9:00 AM - 10:00 PM",
          "Thursday": "9:00 AM - 10:00 PM",
          "Friday": "9:00 AM - 11:00 PM",
          "Saturday": "9:00 AM - 11:00 PM",
          "Sunday": "9:00 AM - 9:00 PM"
        },
        latitude: "45.5232",
        longitude: "-122.6819",
        featureIds: [2, 3, 4],
        live: true
      },
      {
        name: "The Strand Bookstore",
        street: "828 Broadway",
        city: "New York",
        state: "NY",
        zip: "10003",
        description: "Home to 18 miles of books, this New York City landmark features new, used, and rare books.",
        imageUrl: "https://images.unsplash.com/photo-1533826418470-0cef7eb8bdaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        website: "http://www.strandbooks.com",
        phone: "(212) 473-1452",
        hours: { 
          "Monday": "9:30 AM - 8:30 PM",
          "Tuesday": "9:30 AM - 8:30 PM",
          "Wednesday": "9:30 AM - 8:30 PM",
          "Thursday": "9:30 AM - 8:30 PM",
          "Friday": "9:30 AM - 8:30 PM",
          "Saturday": "9:30 AM - 8:30 PM",
          "Sunday": "10:30 AM - 7:30 PM"
        },
        latitude: "40.7336",
        longitude: "-73.9908",
        featureIds: [1, 4, 7],
        live: true
      },
      {
        name: "Book People",
        street: "603 N Lamar Blvd",
        city: "Austin",
        state: "TX",
        zip: "78703",
        description: "Texas' premier independent bookstore, featuring frequent author events and a diverse selection of titles.",
        imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        website: "http://www.bookpeople.com",
        phone: "(512) 472-5050",
        hours: { 
          "Monday": "9:00 AM - 9:00 PM",
          "Tuesday": "9:00 AM - 9:00 PM",
          "Wednesday": "9:00 AM - 9:00 PM",
          "Thursday": "9:00 AM - 9:00 PM",
          "Friday": "9:00 AM - 9:00 PM",
          "Saturday": "9:00 AM - 9:00 PM",
          "Sunday": "9:00 AM - 9:00 PM"
        },
        latitude: "30.2752",
        longitude: "-97.7536",
        featureIds: [1, 2, 5],
        live: true
      },
      {
        name: "Elliott Bay Book Company",
        street: "1521 10th Ave",
        city: "Seattle",
        state: "WA",
        zip: "98122",
        description: "Seattle's iconic independent bookstore with cedar shelves, reading nooks, and over 150,000 titles.",
        imageUrl: "https://pixabay.com/get/g19250fbdac2034d9a52598452a015110ca00e8a72f6f106864355fe192e17a2f7b06bb3391d499dc2b825b670440e97c837b67954aaaa898a198fa05df311386_1280.jpg",
        website: "http://www.elliottbaybook.com",
        phone: "(206) 624-6600",
        hours: { 
          "Monday": "10:00 AM - 8:00 PM",
          "Tuesday": "10:00 AM - 8:00 PM",
          "Wednesday": "10:00 AM - 8:00 PM",
          "Thursday": "10:00 AM - 8:00 PM",
          "Friday": "10:00 AM - 8:00 PM",
          "Saturday": "10:00 AM - 8:00 PM",
          "Sunday": "10:00 AM - 8:00 PM"
        },
        latitude: "47.6142",
        longitude: "-122.3192",
        featureIds: [1, 2, 3, 8],
        live: true
      },
      {
        name: "Tattered Cover Book Store",
        street: "2526 E Colfax Ave",
        city: "Denver",
        state: "CO",
        zip: "80206",
        description: "A leading independent bookstore known for its warm atmosphere, knowledgeable staff, and extensive inventory.",
        imageUrl: "https://pixabay.com/get/ge0dbb377908f4d4cf2abc1fb59b7bbebce8f79c3fc968b875fb589c86fa09193b24c436494cf183cb26093951597295d7e6f938ef23f48dbe21fdbb8e4ca8961_1280.jpg",
        website: "http://www.tatteredcover.com",
        phone: "(303) 322-7727",
        hours: { 
          "Monday": "9:00 AM - 8:00 PM",
          "Tuesday": "9:00 AM - 8:00 PM",
          "Wednesday": "9:00 AM - 8:00 PM",
          "Thursday": "9:00 AM - 8:00 PM",
          "Friday": "9:00 AM - 8:00 PM",
          "Saturday": "9:00 AM - 8:00 PM",
          "Sunday": "10:00 AM - 6:00 PM"
        },
        latitude: "39.7404",
        longitude: "-104.9503",
        featureIds: [2, 5, 8],
        live: true
      },
      {
        name: "Inactive Bookstore Example",
        street: "123 Test St",
        city: "Test City",
        state: "CA",
        zip: "12345",
        description: "This is an example of a bookstore that won't be displayed because it has live set to false.",
        imageUrl: null,
        website: null,
        phone: null,
        hours: null,
        latitude: "37.7749",
        longitude: "-122.4194",
        featureIds: [1],
        live: false
      }
    ];

    bookstoresList.forEach(bookstore => {
      this.createBookstore(bookstore);
    });
  }

  private initializeEvents(): void {
    const eventsList = [
      {
        bookshopId: 1,
        title: "Author Reading: Margaret Atwood",
        description: "Join us for a reading and Q&A with award-winning author Margaret Atwood presenting her latest novel.",
        date: "2023-08-15",
        time: "7:00 PM"
      },
      {
        bookshopId: 1,
        title: "Poetry Night: Local Voices",
        description: "A celebration of San Francisco's vibrant poetry scene featuring readings from five local poets.",
        date: "2023-08-20",
        time: "6:30 PM"
      },
      {
        bookshopId: 2,
        title: "Author Reading: Zadie Smith",
        description: "Join us for a reading and Q&A with award-winning author Zadie Smith presenting her latest novel.",
        date: "2023-08-15",
        time: "7:00 PM"
      },
      {
        bookshopId: 2,
        title: "Poetry Night: Local Voices",
        description: "A celebration of Portland's vibrant poetry scene featuring readings from five local poets.",
        date: "2023-08-20",
        time: "6:30 PM"
      },
      {
        bookshopId: 2,
        title: "Children's Story Hour",
        description: "Weekly storytime for children ages 3-8 with activities and themed readings.",
        date: "2023-08-26",
        time: "11:00 AM"
      },
      {
        bookshopId: 3,
        title: "Book Club: Discussion of 'The Overstory'",
        description: "Join our monthly book club as we discuss Richard Powers' Pulitzer Prize-winning novel.",
        date: "2023-08-18",
        time: "6:00 PM"
      },
      {
        bookshopId: 4,
        title: "Sci-Fi Author Panel",
        description: "A discussion with prominent science fiction authors about the future of the genre.",
        date: "2023-08-25",
        time: "7:30 PM"
      }
    ];

    eventsList.forEach(event => {
      this.createEvent(event);
    });
  }
}

export const storage = new MemStorage();
