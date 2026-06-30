#!/bin/bash

echo "🧪 Testing Multi-Select States Filter Functionality"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="$3"
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "URL: $url"
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - HTTP $response"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected HTTP $expected_status, got HTTP $response"
    fi
}

# First, get some state IDs from the states endpoint
echo -e "\n${YELLOW}1. Getting Available States${NC}"
STATES_RESPONSE=$(curl -s " https://api.waadi.in/api/v1/states/admin")
echo "States response: $STATES_RESPONSE" | head -3

# Test with no state filter (should work)
echo -e "\n${YELLOW}2. Testing No State Filter${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=5&status=paid" "No state filter" "200"

# Test with single state (backward compatibility)
echo -e "\n${YELLOW}3. Testing Single State Filter (Backward Compatibility)${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=5&state_id=6891f4ae463073b51ec50c47" "Single state filter" "200"

# Test with multiple states
echo -e "\n${YELLOW}4. Testing Multiple States Filter${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=5&state_ids=6891f4ae463073b51ec50c47,6891fe63463073b51ec50e86" "Multiple states filter" "200"

# Test with multiple states and other filters
echo -e "\n${YELLOW}5. Testing Multiple States with Other Filters${NC}"
today=$(date +%Y-%m-%d)
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=5&status=paid&state_ids=6891f4ae463073b51ec50c47,6891fe63463073b51ec50e86&date_from=$today&date_to=$today" "Multiple states with date filters" "200"

# Test with empty state_ids (should work like no filter)
echo -e "\n${YELLOW}6. Testing Empty State IDs${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=5&state_ids=" "Empty state_ids" "200"

echo -e "\n${GREEN}✅ Multi-select states filter tests completed!${NC}"
echo -e "\n${BLUE}Summary:${NC}"
echo "- Multi-select states filter should work with comma-separated state IDs"
echo "- Backward compatibility with single state_id should be maintained"
echo "- Empty state_ids should work like no filter"
echo "- Multiple states should be combined with OR logic in database query"
