import { IStorage } from './storage';
import { Bookstore, Feature, Event, InsertBookstore, InsertFeature, InsertEvent, User, InsertUser } from '@shared/schema';
import { supabase } from './supabase';
import { populateCountyData } from './countyLookup';

/**
 * SupabaseStorage - Implements IStorage interface using Supabase as the data source
 * This replaces Google Sheets storage for reading bookstores, features, and events
 */
export class SupabaseStorage implements IStorage {
  private slugToBookstoreId: Map<string, number> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Initialize slug mappings asynchronously
    this.initializeSlugMappings();
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeSlugMappings();
    }
  }

  /**
   * Generate a slug from a bookshop name (must match client-side logic)
   */
  private generateSlugFromName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();                  // Trim leading/trailing spaces
  }

  /**
   * Initialize slug mappings for fast lookups
   */
  private async initializeSlugMappings() {
    if (!supabase) {
      console.warn('Supabase client not available, cannot initialize slug mappings');
      return;
    }

    try {
      console.log('Initializing bookshop slug mappings from Supabase...');
      this.slugToBookstoreId.clear();

      // Fetch all live bookstores
      const { data: bookstores, error } = await supabase
        .from('bookstores')
        .select('id, name, live')
        .eq('live', true);

      if (error) {
        console.error('Error fetching bookstores for slug mapping:', error);
        return;
      }

      if (!bookstores) {
        console.warn('No bookstores returned from Supabase');
        return;
      }

      let duplicatesFound = 0;

      bookstores.forEach(bookstore => {
        const slug = this.generateSlugFromName(bookstore.name);

        if (this.slugToBookstoreId.has(slug)) {
          duplicatesFound++;
          const existingId = this.slugToBookstoreId.get(slug);
          console.log(`Duplicate slug "${slug}" detected. Previous ID: ${existingId}, New: "${bookstore.name}" (ID: ${bookstore.id})`);
        }

        this.slugToBookstoreId.set(slug, bookstore.id);
      });

      if (duplicatesFound > 0) {
        console.log(`Found ${duplicatesFound} duplicate slugs. In cases of duplicates, the last bookshop with that slug will be used.`);
      }

      console.log(`Created ${this.slugToBookstoreId.size} slug mappings for bookshops`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing slug mappings:', error);
    }
  }

  // User operations (not implemented - using Supabase auth)
  async getUser(id: number): Promise<User | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data as User;
  }

  async updateUserFavorites(userId: number, favorites: string[]): Promise<User | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('users')
      .update({ favorites })
      .eq('id', userId)
      .select()
      .single();
    if (error || !data) return undefined;
    return data as User;
  }

  // Bookstore operations
  async getBookstores(): Promise<Bookstore[]> {
    if (!supabase) {
      console.warn('Supabase client not available');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('bookstores')
        .select('*')
        .eq('live', true)
        .order('name');

      if (error) {
        console.error('Error fetching bookstores from Supabase:', error);
        return [];
      }

      // Map Supabase column names to match Bookstore type
      const bookstores = (data || []).map((item: any) => ({
        ...item,
        latitude: item.lat_numeric?.toString() || item.latitude || null,
        longitude: item.lng_numeric?.toString() || item.longitude || null,
        featureIds: item.feature_ids || item.featureIds || [],
        imageUrl: item.image_url || item.imageUrl || null,
      })) as Bookstore[];

      return populateCountyData(bookstores);
    } catch (error) {
      console.error('Error in getBookstores:', error);
      return [];
    }
  }

  async getBookstore(id: number): Promise<Bookstore | undefined> {
    if (!supabase) return undefined;

    try {
      const { data, error } = await supabase
        .from('bookstores')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return undefined;

      // Map Supabase column names
      return {
        ...data,
        latitude: data.lat_numeric?.toString() || data.latitude || null,
        longitude: data.lng_numeric?.toString() || data.longitude || null,
        featureIds: data.feature_ids || data.featureIds || [],
        imageUrl: data.image_url || data.imageUrl || null,
      } as Bookstore;
    } catch (error) {
      console.error('Error fetching bookstore by ID:', error);
      return undefined;
    }
  }

  async getBookstoreBySlug(slug: string): Promise<Bookstore | undefined> {
    await this.ensureInitialized();

    if (!supabase) {
      console.warn('Supabase client not available');
      return undefined;
    }

    console.log(`[getBookstoreBySlug] Looking up bookstore with slug: "${slug}"`);
    console.log(`[getBookstoreBySlug] Slug map size: ${this.slugToBookstoreId.size}`);

    // Check if we already have this slug mapped
    const bookstoreId = this.slugToBookstoreId.get(slug);

    if (bookstoreId) {
      console.log(`[getBookstoreBySlug] Found ID ${bookstoreId} in slug map, fetching from Supabase...`);
      const bookstore = await this.getBookstore(bookstoreId);
      if (bookstore) {
        console.log(`[getBookstoreBySlug] Found bookstore by slug map: "${bookstore.name}" (ID: ${bookstoreId})`);
      }
      return bookstore;
    }

    // Fallback - if no mapping exists, try direct search
    console.log(`[getBookstoreBySlug] No slug mapping for "${slug}", trying direct lookup`);
    
    try {
      // Fetch all bookstores and find by slug (less efficient but works as fallback)
      const bookstores = await this.getBookstores();
      const bookstoreWithSlug = bookstores.find(b => {
        const nameSlug = this.generateSlugFromName(b.name);
        if (nameSlug === slug) {
          console.log(`[getBookstoreBySlug] Match found: "${b.name}" (ID: ${b.id}) matches slug "${slug}"`);
        }
        return nameSlug === slug;
      });

      if (bookstoreWithSlug) {
        console.log(`[getBookstoreBySlug] Found bookstore by direct search: "${bookstoreWithSlug.name}" (ID: ${bookstoreWithSlug.id})`);
        // Add to map for future lookups
        this.slugToBookstoreId.set(slug, bookstoreWithSlug.id);
      } else {
        console.log(`[getBookstoreBySlug] No bookstore found with slug: "${slug}"`);
      }

      return bookstoreWithSlug;
    } catch (error) {
      console.error('Error in getBookstoreBySlug fallback:', error);
      return undefined;
    }
  }

  async getBookstoresByState(state: string): Promise<Bookstore[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .eq('state', state)
      .eq('live', true)
      .order('name');
    
    if (error || !data) return [];
    
    return (data || []).map((item: any) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
    })) as Bookstore[];
  }

  async getBookstoresByCity(city: string): Promise<Bookstore[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .ilike('city', city)
      .eq('live', true)
      .order('name');
    
    if (error || !data) return [];
    
    return (data || []).map((item: any) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
    })) as Bookstore[];
  }

  async getBookstoresByFeatures(featureIds: number[]): Promise<Bookstore[]> {
    if (!supabase || !featureIds.length) return [];
    
    // Supabase doesn't have a direct array contains operator, so we need to query differently
    // This is a simplified version - you may need to adjust based on your schema
    const { data, error } = await supabase
      .from('bookstores')
      .select('*')
      .eq('live', true);
    
    if (error || !data) return [];
    
    // Filter client-side for now (can be optimized with a join table query)
    const bookstores = (data || []).map((item: any) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
    })) as Bookstore[];

    return bookstores.filter(b => {
      const bookshopFeatures = b.featureIds || [];
      return featureIds.some(fid => bookshopFeatures.includes(fid));
    });
  }

  async getFilteredBookstores(filters: { state?: string, city?: string, county?: string, featureIds?: number[] }): Promise<Bookstore[]> {
    if (!supabase) return [];

    let query = supabase.from('bookstores').select('*').eq('live', true);

    if (filters.state) {
      query = query.eq('state', filters.state);
    }

    if (filters.city) {
      query = query.ilike('city', filters.city);
    }

    // Note: County filtering may need special handling depending on your schema
    if (filters.county) {
      query = query.ilike('county', filters.county);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    let bookstores = (data || []).map((item: any) => ({
      ...item,
      latitude: item.lat_numeric?.toString() || item.latitude || null,
      longitude: item.lng_numeric?.toString() || item.longitude || null,
      featureIds: item.feature_ids || item.featureIds || [],
      imageUrl: item.image_url || item.imageUrl || null,
    })) as Bookstore[];

    // Filter by features if provided
    if (filters.featureIds && filters.featureIds.length > 0) {
      bookstores = bookstores.filter(b => {
        const bookshopFeatures = b.featureIds || [];
        return filters.featureIds!.some(fid => bookshopFeatures.includes(fid));
      });
    }

    return populateCountyData(bookstores);
  }

  async createBookstore(bookstore: InsertBookstore): Promise<Bookstore> {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('bookstores').insert(bookstore).select().single();
    if (error) throw error;
    return data as Bookstore;
  }

  // Feature operations
  async getFeatures(): Promise<Feature[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('features').select('*').order('name');
    if (error || !data) return [];
    return data as Feature[];
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('features').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return data as Feature;
  }

  async createFeature(feature: InsertFeature): Promise<Feature> {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('features').insert(feature).select().single();
    if (error) throw error;
    return data as Feature;
  }

  // Event operations
  async getEvents(): Promise<Event[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('events').select('*').order('date');
    if (error || !data) return [];
    return data as Event[];
  }

  async getEventsByBookshop(bookshopId: number): Promise<Event[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('bookshopId', bookshopId)
      .order('date');
    if (error || !data) return [];
    return data as Event[];
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.from('events').insert(event).select().single();
    if (error) throw error;
    return data as Event;
  }
}

