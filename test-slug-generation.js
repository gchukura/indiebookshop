// Test script to verify slug generation handles edge cases correctly

function generateSlugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();                  // Trim leading/trailing spaces
}

// Test cases
const testCases = [
  { input: "Powell's Books", expected: "powells-books" },
  { input: "Barnes & Noble", expected: "barnes-noble" },
  { input: "Bookshop 123", expected: "bookshop-123" },
  { input: "The Book Shop", expected: "the-book-shop" },
  { input: "Book's & More!", expected: "books-more" },
  { input: "Apostrophe's Bookstore", expected: "apostrophes-bookstore" },
  { input: "Bookshop (Downtown)", expected: "bookshop-downtown" },
  { input: "Bookshop--Double--Hyphens", expected: "bookshop-double-hyphens" },
  { input: "  Bookshop with spaces  ", expected: "bookshop-with-spaces" },
];

console.log("Testing Slug Generation Function\n");
console.log("=".repeat(60));

let allPassed = true;

testCases.forEach(({ input, expected }) => {
  const result = generateSlugFromName(input);
  const passed = result === expected;
  allPassed = allPassed && passed;
  
  console.log(`Input:    "${input}"`);
  console.log(`Expected: "${expected}"`);
  console.log(`Got:      "${result}"`);
  console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log("-".repeat(60));
});

console.log(`\nOverall: ${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);

