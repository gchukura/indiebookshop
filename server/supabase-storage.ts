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

      // Fetch all live bookstores with pagination to handle Supabase's 1000 row limit
      const allBookstores: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('bookstores')
          .select('id, name, live')
          .eq('live', true)
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching bookstores for slug mapping:', error);
          break;
        }

        if (data && data.length > 0) {
          allBookstores.push(...data);
          from += pageSize;
          // If we got fewer than pageSize, we've reached the end
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allBookstores.length === 0) {
        console.warn('No bookstores returned from Supabase');
        return;
      }

      let duplicatesFound = 0;

      allBookstores.forEach(bookstore => {
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

      console.log(`Created ${this.slugToBookstoreId.size} slug mappings for bookshops (fetched ${allBookstores.length} total)`);
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
      // Fetch all bookstores with pagination to handle Supabase's 1000 row limit
      const allBookstores: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('bookstores')
          .select('*')
          .eq('live', true)
          .order('name')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching bookstores from Supabase:', error);
          break;
        }

        if (data && data.length > 0) {
          allBookstores.push(...data);
          from += pageSize;
          // If we got fewer than pageSize, we've reached the end
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Fetched ${allBookstores.length} bookstores (paginated)`);

      // Map Supabase column names to match Bookstore type
      const bookstores = allBookstores.map((item: any) => ({
        ...item,
        latitude: item.lat_numeric?.toString() || item.latitude || null,
        longitude: item.lng_numeric?.toString() || item.longitude || null,
        featureIds: item.feature_ids || item.featureIds || [],
        imageUrl: item.image_url || item.imageUrl || null,
        // Map hours from hours_json (jsonb) to hours for frontend
        // Prefer hours_json (jsonb) over "hours (JSON)" (text)
        hours: (() => {
          if (item.hours_json) {
            return typeof item.hours_json === 'string' ? JSON.parse(item.hours_json) : item.hours_json;
          }
          if (item['hours (JSON)']) {
            return typeof item['hours (JSON)'] === 'string' ? JSON.parse(item['hours (JSON)']) : item['hours (JSON)'];
          }
          return null;
        })(),
        // Map Google Places fields from snake_case to camelCase
        googlePlaceId: item.google_place_id || null,
        googleRating: item.google_rating || null,
        googleReviewCount: item.google_review_count || null,
        googleDescription: item.google_description || null,
        googlePhotos: item.google_photos || null,
        googleReviews: item.google_reviews || null,
        googlePriceLevel: item.google_price_level || null,
        googleDataUpdatedAt: item.google_data_updated_at || null,
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
        // Map hours from hours_json (jsonb) to hours for frontend
        // Prefer hours_json (jsonb) over "hours (JSON)" (text)
        hours: (() => {
          if (data.hours_json) {
            return typeof data.hours_json === 'string' ? JSON.parse(data.hours_json) : data.hours_json;
          }
          if (data['hours (JSON)']) {
            return typeof data['hours (JSON)'] === 'string' ? JSON.parse(data['hours (JSON)']) : data['hours (JSON)'];
          }
          return null;
        })(),
        // Map Google Places fields from snake_case to camelCase
        googlePlaceId: data.google_place_id || null,
        googleRating: data.google_rating || null,
        googleReviewCount: data.google_review_count || null,
        googleDescription: data.google_description || null,
        googlePhotos: data.google_photos || null,
        googleReviews: data.google_reviews || null,
        googlePriceLevel: data.google_price_level || null,
        googleDataUpdatedAt: data.google_data_updated_at || null,
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
    try {
      // Fetch all bookstores and find by slug (less efficient but works as fallback)
      const bookstores = await this.getBookstores();
      const bookstoreWithSlug = bookstores.find(b => {
        const nameSlug = this.generateSlugFromName(b.name);
        return nameSlug === slug;
      });

      if (bookstoreWithSlug) {
        // Add to map for future lookups
        this.slugToBookstoreId.set(slug, bookstoreWithSlug.id);
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
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
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
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
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
      // Map Google Places fields from snake_case to camelCase
      googlePlaceId: item.google_place_id || null,
      googleRating: item.google_rating || null,
      googleReviewCount: item.google_review_count || null,
      googleDescription: item.google_description || null,
      googlePhotos: item.google_photos || null,
      googleReviews: item.google_reviews || null,
      googlePriceLevel: item.google_price_level || null,
      googleDataUpdatedAt: item.google_data_updated_at || null,
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
    
    // Map features to include id field for client compatibility
    // Supabase features table may use slug as primary key, but client expects numeric id
    // Generate stable numeric IDs from slugs for compatibility
    return data.map((feature, index) => {
      // If feature already has id field, use it
      if (feature.id !== undefined && feature.id !== null) {
        return feature as Feature;
      }
      
      // Generate stable numeric ID from slug using hash function
      // This ensures same slug always gets same ID
      let numericId = index + 1; // Fallback to index-based ID
      if (feature.slug) {
        // Simple hash function to convert slug to numeric ID
        let hash = 0;
        for (let i = 0; i < feature.slug.length; i++) {
          const char = feature.slug.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        numericId = Math.abs(hash) % 100000; // Keep IDs reasonable (0-99999)
      }
      
      return {
        id: numericId,
        name: feature.name,
        slug: feature.slug,
        description: feature.description,
        keywords: feature.keywords,
        icon: feature.icon,
        created_at: feature.created_at,
        // Include any other fields that might exist
        ...feature
      } as Feature;
    });
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    if (!supabase) return undefined;
    
    // Try querying by id first (if id column exists)
    let { data, error } = await supabase.from('features').select('*').eq('id', id).single();
    
    // If query by id fails, try to find by matching generated ID from slug
    if (error || !data) {
      // Get all features and find one that matches the generated ID
      const allFeatures = await this.getFeatures();
      data = allFeatures.find(f => f.id === id);
      if (!data) return undefined;
    }
    
    // Ensure id field exists in response
    if (data && !data.id && (data as any).slug) {
      // Generate ID from slug (same logic as getFeatures)
      let hash = 0;
      const slug = (data as any).slug;
      for (let i = 0; i < slug.length; i++) {
        const char = slug.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      (data as any).id = Math.abs(hash) % 100000;
    }
    
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

