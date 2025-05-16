// Serverless-compatible version of storage.js for Vercel deployment

// Define the storage interface
class MemStorage {
  constructor() {
    this.users = new Map();
    this.bookstores = new Map();
    this.features = new Map();
    this.events = new Map();
    
    this.userCurrentId = 1;
    this.bookstoreCurrentId = 1;
    this.featureCurrentId = 1;
    this.eventCurrentId = 1;
    
    // Initialize with sample data
    this.initializeFeatures();
    this.initializeBookstores();
    this.initializeEvents();
  }
  
  // User operations
  async getUser(id) {
    return this.users.get(id);
  }
  
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id, favorites: [] };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserFavorites(userId, favorites) {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.favorites = favorites;
    this.users.set(userId, user);
    return user;
  }
  
  // Bookstore operations
  async getBookstores() {
    return Array.from(this.bookstores.values());
  }
  
  async getBookstore(id) {
    return this.bookstores.get(id);
  }
  
  async getBookstoresByState(state) {
    return Array.from(this.bookstores.values()).filter(b => 
      b.live !== false && 
      b.state === state
    );
  }
  
  async getBookstoresByCity(city) {
    return Array.from(this.bookstores.values()).filter(b => 
      b.live !== false && 
      b.city === city
    );
  }
  
  async getBookstoresByFeatures(featureIds) {
    return Array.from(this.bookstores.values()).filter(bookstore => 
      bookstore.live !== false &&
      (bookstore.featureIds?.some(id => featureIds.includes(id)) || false)
    );
  }
  
  async getFilteredBookstores(filters) {
    let filteredBookstores = Array.from(this.bookstores.values()).filter(b => b.live !== false);
    
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
  
  async createBookstore(insertBookstore) {
    const id = this.bookstoreCurrentId++;
    const bookstore = { 
      ...insertBookstore, 
      id,
      live: insertBookstore.live !== undefined ? insertBookstore.live : true
    };
    this.bookstores.set(id, bookstore);
    return bookstore;
  }
  
  // Feature operations
  async getFeatures() {
    return Array.from(this.features.values());
  }
  
  async getFeature(id) {
    return this.features.get(id);
  }
  
  async createFeature(insertFeature) {
    const id = this.featureCurrentId++;
    const feature = { ...insertFeature, id };
    this.features.set(id, feature);
    return feature;
  }
  
  // Event operations
  async getEvents() {
    return Array.from(this.events.values());
  }
  
  async getEventsByBookshop(bookshopId) {
    return Array.from(this.events.values()).filter(e => e.bookshopId === bookshopId);
  }
  
  async createEvent(insertEvent) {
    const id = this.eventCurrentId++;
    const event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }
  
  // Initialize sample data
  initializeFeatures() {
    [
      { id: 1, name: 'Coffee Shop' },
      { id: 2, name: 'Used Books' },
      { id: 3, name: 'Rare Books' },
      { id: 4, name: 'Children\'s Section' },
      { id: 5, name: 'Author Events' },
      { id: 6, name: 'Open Mic Nights' },
      { id: 7, name: 'Book Clubs' },
      { id: 8, name: 'Wi-Fi' }
    ].forEach(feature => {
      this.features.set(feature.id, feature);
      if (feature.id >= this.featureCurrentId) {
        this.featureCurrentId = feature.id + 1;
      }
    });
  }
  
  initializeBookstores() {
    [
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
    ].forEach(bookstore => {
      this.bookstores.set(bookstore.id, bookstore);
      if (bookstore.id >= this.bookstoreCurrentId) {
        this.bookstoreCurrentId = bookstore.id + 1;
      }
    });
  }
  
  initializeEvents() {
    [
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
    ].forEach(event => {
      this.events.set(event.id, event);
      if (event.id >= this.eventCurrentId) {
        this.eventCurrentId = event.id + 1;
      }
    });
  }
}

// Export the storage implementation
export const storage = new MemStorage();