// ============================================================================
// MOBILE COMPONENTS - Replace MobileBottomSheet with these components
// ============================================================================

import React, { useRef, useState } from "react";
import { MapPin, Filter, X, ChevronDown, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Bookstore } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { generateSlugFromName } from "../lib/linkUtils";
import { LOCATION_DELIMITER } from "@/lib/constants";

// ============================================================================
// MOBILE VIEW TOGGLE BAR
// ============================================================================

interface MobileViewToggleProps {
  viewMode: "list" | "map";
  onViewModeChange: (mode: "list" | "map") => void;
}

export const MobileViewToggle: React.FC<MobileViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => onViewModeChange("list")}
        className={`flex-1 py-2.5 px-4 rounded-full font-sans text-sm font-semibold transition-all ${
          viewMode === "list"
            ? "bg-[#2A6B7C] text-white shadow-md"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        📚 List
      </button>
      <button
        onClick={() => onViewModeChange("map")}
        className={`flex-1 py-2.5 px-4 rounded-full font-sans text-sm font-semibold transition-all ${
          viewMode === "map"
            ? "bg-[#2A6B7C] text-white shadow-md"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        🗺️ Map
      </button>
    </div>
  );
};

// ============================================================================
// MOBILE FILTER BAR (Top bar with filter button and count)
// ============================================================================

interface MobileFilterBarProps {
  activeFilterCount: number;
  resultCount: number;
  onOpenFilters: () => void;
}

export const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  activeFilterCount,
  resultCount,
  onOpenFilters,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <button
        onClick={onOpenFilters}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-semibold transition-all ${
          activeFilterCount > 0
            ? "bg-[#E16D3D] text-white shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-white text-[#E16D3D] px-2 py-0.5 rounded-full text-xs font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>
      <span className="font-sans text-sm text-gray-600">
        {resultCount} bookshop{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

// ============================================================================
// MOBILE FILTER DRAWER (Bottom sheet with all filters)
// ============================================================================

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  
  // State filters
  selectedState: string;
  onStateChange: (state: string) => void;
  states: string[];
  
  // City filters
  selectedCity: string;
  onCityChange: (city: string) => void;
  cities: string[];
  
  // County filters
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  counties: string[];
  
  // Feature filters (commented out but structure preserved)
  // selectedFeatures: number[];
  // onToggleFeature: (featureId: number) => void;
  // features: Array<{ id: number; name: string }>;
  
  activeFilterCount: number;
  onClearAll: () => void;
  resultCount: number;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  selectedState,
  onStateChange,
  states,
  selectedCity,
  onCityChange,
  cities,
  selectedCounty,
  onCountyChange,
  counties,
  // selectedFeatures,
  // onToggleFeature,
  // features,
  activeFilterCount,
  onClearAll,
  resultCount,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto md:hidden">
        {/* Drag Handle */}
        <div className="flex items-center justify-center py-3 sticky top-0 bg-white border-b border-gray-100">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sticky top-12 bg-white border-b border-gray-200 z-10">
          <h2 className="font-serif text-xl font-bold text-[#5F4B32]">Filters</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="px-4 py-4 space-y-5 pb-32">
          {/* Location Section */}
          <div>
            <h3 className="font-sans text-sm font-semibold text-gray-700 mb-3">
              Location
            </h3>

            {/* State Filter */}
            <div className="mb-3">
              <label className="font-sans text-xs text-gray-600 mb-1 block">
                State
              </label>
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => {
                    onStateChange(e.target.value);
                    // Reset city/county when state changes
                    if (e.target.value === "all") {
                      onCityChange("all");
                      onCountyChange("all");
                    }
                  }}
                  className="appearance-none w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent"
                >
                  <option value="all">All States</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* City Filter */}
            <div className="mb-3">
              <label className="font-sans text-xs text-gray-600 mb-1 block">
                City
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => onCityChange(e.target.value)}
                  disabled={cities.length === 0}
                  className={`appearance-none w-full border-2 rounded-xl px-4 py-3 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent ${
                    cities.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  }`}
                >
                  <option value="all">
                    {selectedState === "all"
                      ? "Select a state first"
                      : cities.length === 0
                      ? "No cities available"
                      : "All Cities"}
                  </option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city.replace(LOCATION_DELIMITER, ", ")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* County Filter */}
            <div>
              <label className="font-sans text-xs text-gray-600 mb-1 block">
                County
              </label>
              <div className="relative">
                <select
                  value={selectedCounty}
                  onChange={(e) => onCountyChange(e.target.value)}
                  disabled={counties.length === 0}
                  className={`appearance-none w-full border-2 rounded-xl px-4 py-3 pr-10 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent ${
                    counties.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                      : "bg-gray-50 text-gray-900 border-gray-200"
                  }`}
                >
                  <option value="all">
                    {selectedState === "all"
                      ? "Select a state first"
                      : counties.length === 0
                      ? "No counties available"
                      : "All Counties"}
                  </option>
                  {counties.map((county) => (
                    <option key={county} value={county}>
                      {county.replace(LOCATION_DELIMITER, ", ")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* FEATURE FILTERS - COMMENTED OUT: Not ready yet */}
          {/* <div>
            <h3 className="font-sans text-sm font-semibold text-gray-700 mb-3">
              Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => onToggleFeature(feature.id)}
                  className={`px-4 py-2 rounded-full text-sm font-sans font-medium transition-all ${
                    selectedFeatures.includes(feature.id)
                      ? "bg-[#2A6B7C] text-white border-2 border-[#2A6B7C]"
                      : "bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {feature.name}
                </button>
              ))}
            </div>
          </div> */}
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 px-4 py-4 flex gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-sans text-sm font-semibold transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-[2] py-3 px-4 bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full font-sans text-sm font-semibold transition-colors shadow-md"
          >
            Show {resultCount} Result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// MOBILE LIST VIEW
// ============================================================================

interface MobileListViewProps {
  bookshops: Bookstore[];
  isLoading: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  selectedBookshopId: number | null;
  onBookshopClick: (id: number) => void;
  onMapThumbnailClick: () => void;
}

export const MobileListView: React.FC<MobileListViewProps> = ({
  bookshops,
  isLoading,
  activeFilterCount,
  onClearFilters,
  selectedBookshopId,
  onBookshopClick,
  onMapThumbnailClick,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-3">
        {/* Map Thumbnail */}
        <button
          onClick={onMapThumbnailClick}
          className="w-full h-36 bg-gradient-to-br from-[#2A6B7C] to-[#1d5a6a] rounded-xl flex flex-col items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 20px, white 20px, white 21px),
                  repeating-linear-gradient(90deg, transparent, transparent 20px, white 20px, white 21px)
                `,
              }}
            />
          </div>
          
          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="text-2xl mb-2">📍 🗺️ 📍</div>
            <div className="font-sans text-sm font-semibold">Tap to view map</div>
            <div className="font-sans text-xs opacity-75 mt-1">
              {bookshops.length} bookshop{bookshops.length !== 1 ? "s" : ""} in this area
            </div>
          </div>
        </button>

        {/* Bookshop Cards */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-[#2A6B7C] animate-spin mb-3" />
            <p className="font-sans text-sm text-gray-600">Loading bookshops...</p>
          </div>
        ) : bookshops.length > 0 ? (
          bookshops.map((bookshop) => (
            <MobileBookshopCard
              key={bookshop.id}
              bookshop={bookshop}
              isSelected={selectedBookshopId === bookshop.id}
              onClick={() => onBookshopClick(bookshop.id)}
            />
          ))
        ) : (
          <div className="py-12 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
            <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="font-serif text-lg font-bold text-gray-700 mb-2">
              No bookshops found
            </h3>
            <p className="font-sans text-sm text-gray-600 mb-4">
              Try adjusting your filters or search in a different area
            </p>
            {activeFilterCount > 0 && (
              <Button
                onClick={onClearFilters}
                variant="outline"
                size="sm"
                className="rounded-full font-sans"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE BOOKSHOP CARD
// ============================================================================

interface MobileBookshopCardProps {
  bookshop: Bookstore;
  isSelected: boolean;
  onClick: () => void;
}

const MobileBookshopCard: React.FC<MobileBookshopCardProps> = ({
  bookshop,
  isSelected,
  onClick,
}) => {
  const slug = generateSlugFromName(bookshop.name);

  return (
    <div
      id={`bookshop-${bookshop.id}`}
      onClick={onClick}
      className={`bg-white rounded-xl p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-2 border-[#E16D3D] shadow-lg"
          : "border-2 border-gray-200 hover:border-gray-300 shadow-sm"
      }`}
    >
      <h3 className="font-serif font-bold text-base text-[#5F4B32] mb-2 line-clamp-1">
        {bookshop.name}
      </h3>

      {(bookshop.city || bookshop.state) && (
        <div className="flex items-start text-xs text-gray-600 mb-2">
          <MapPin className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
          <span className="font-sans line-clamp-1">
            {bookshop.city && `${bookshop.city}, `}
            {bookshop.state}
          </span>
        </div>
      )}

      {bookshop.description && (
        <p className="font-sans text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
          {bookshop.description}
        </p>
      )}

      {/* Feature tags - if/when features are enabled */}
      {bookshop.featureIds && bookshop.featureIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {bookshop.featureIds.slice(0, 3).map((featureId) => (
            <span
              key={featureId}
              className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-sans"
            >
              Feature {featureId}
            </span>
          ))}
          {bookshop.featureIds.length > 3 && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-sans">
              +{bookshop.featureIds.length - 3} more
            </span>
          )}
        </div>
      )}

      <Link
        href={`/bookshop/${slug}`}
        className="font-sans text-sm text-[#2A6B7C] hover:underline font-semibold inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        View details →
      </Link>
    </div>
  );
};

// ============================================================================
// MOBILE MAP VIEW (with card carousel)
// ============================================================================

interface MobileMapViewProps {
  bookshops: Bookstore[];
  selectedBookshopId: number | null;
  onBookshopSelect: (id: number | null) => void;
  children: React.ReactNode; // Map component passed in
}

export const MobileMapView: React.FC<MobileMapViewProps> = ({
  bookshops,
  selectedBookshopId,
  onBookshopSelect,
  children,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Find selected bookshop or use first one
  const displayBookshop = selectedBookshopId
    ? bookshops.find((b) => b.id === selectedBookshopId) || bookshops[0]
    : bookshops[0];

  // Handle swipe navigation
  const handleSwipe = (direction: "left" | "right") => {
    const newIndex =
      direction === "left"
        ? Math.min(currentIndex + 1, bookshops.length - 1)
        : Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
    if (bookshops[newIndex]) {
      onBookshopSelect(bookshops[newIndex].id);
    }
  };

  return (
    <div className="relative h-full">
      {/* Map fills the space */}
      <div className="absolute inset-0">{children}</div>

      {/* Card Carousel at Bottom */}
      {displayBookshop && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-6 max-h-[40vh] overflow-y-auto">
          {/* Drag Handle */}
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Navigation Arrows (if multiple bookshops) */}
          {bookshops.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={() => handleSwipe("right")}
                disabled={currentIndex === 0}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="font-sans text-xs text-gray-500">
                {currentIndex + 1} / {bookshops.length}
              </span>
              <button
                onClick={() => handleSwipe("left")}
                disabled={currentIndex === bookshops.length - 1}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          )}

          {/* Bookshop Card */}
          <MobileBookshopCard
            bookshop={displayBookshop}
            isSelected={true}
            onClick={() => {}}
          />
        </div>
      )}
    </div>
  );
};
