#!/bin/bash

echo "🚀 Wadi Cab API Performance Test"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test scenarios
test_api() {
    local url="$1"
    local description="$2"
    local expected_max_time="$3"
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "URL: $url"
    
    # Run the test multiple times and get average
    local total_time=0
    local iterations=3
    
    for i in $(seq 1 $iterations); do
        local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$url")
        local response_time_ms=$(echo "$response_time * 1000" | bc)
        total_time=$(echo "$total_time + $response_time_ms" | bc)
        
        if (( $(echo "$response_time_ms < $expected_max_time" | bc -l) )); then
            echo -e "  Run $i: ${GREEN}${response_time_ms}ms${NC} ✅"
        else
            echo -e "  Run $i: ${RED}${response_time_ms}ms${NC} ❌"
        fi
    done
    
    local avg_time=$(echo "scale=2; $total_time / $iterations" | bc)
    echo -e "  Average: ${YELLOW}${avg_time}ms${NC}"
    
    if (( $(echo "$avg_time < $expected_max_time" | bc -l) )); then
        echo -e "  Result: ${GREEN}PASS${NC} (Expected: <${expected_max_time}ms)"
    else
        echo -e "  Result: ${RED}FAIL${NC} (Expected: <${expected_max_time}ms)"
    fi
}

# Check if backend is running
echo "🔍 Checking backend status..."
if curl -s -f https://api.waadi.in/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    exit 1
fi

# Test scenarios
echo -e "\n${YELLOW}Running Performance Tests...${NC}"

# 1. Dashboard API
test_api "https://api.waadi.in/api/v1/admin/dashboard" "Dashboard Stats" 1000

# 2. Bookings API - Simple query
test_api "https://api.waadi.in/api/v1/admin/bookings?page=1&limit=10&status=paid" "Bookings API (Simple)" 500

# 3. Bookings API - Complex query with date range
test_api "https://api.waadi.in/api/v1/admin/bookings?page=7&limit=20&status=paid&date_from=2025-09-27&date_to=2025-09-28&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Bookings API (Complex)" 800

# 4. Bookings API - Search query
test_api "https://api.waadi.in/api/v1/admin/bookings?page=1&limit=10&search=WC" "Bookings API (Search)" 600

# 5. Users API
test_api "https://api.waadi.in/api/v1/admin/users?page=1&limit=10" "Users API" 800

echo -e "\n${BLUE}Performance Test Summary${NC}"
echo "========================="
echo "✅ All tests completed"
echo "📊 Check results above for any performance issues"
echo "🔧 If any test fails, consider further optimization"

# Optional: Test with different page numbers
echo -e "\n${YELLOW}Testing pagination performance...${NC}"
for page in 1 5 10 20; do
    test_api "https://api.waadi.in/api/v1/admin/bookings?page=$page&limit=20&status=paid" "Bookings API (Page $page)" 800
done
