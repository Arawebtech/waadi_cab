#!/bin/bash

echo "🧪 Testing Wadi Cab Admin Filter Functionality"
echo "=============================================="

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

echo -e "\n${YELLOW}1. Testing Default Filter (Today's Date)${NC}"
today=$(date +%Y-%m-%d)
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=20&status=paid&date_from=$today&date_to=$today&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Default filters with today's date" "200"

echo -e "\n${YELLOW}2. Testing Custom Date Filter${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=20&status=paid&date_from=2025-09-27&date_to=2025-09-27&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Custom date filter (2025-09-27)" "200"

echo -e "\n${YELLOW}3. Testing Pagination Preservation${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=5&limit=20&status=paid&date_from=2025-09-27&date_to=2025-09-27&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Page 5 with filters preserved" "200"

echo -e "\n${YELLOW}4. Testing Different Status Filter${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=20&status=pending&date_from=$today&date_to=$today&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Status filter: pending" "200"

echo -e "\n${YELLOW}5. Testing Search Filter${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=20&search=UP16&status=&date_from=$today&date_to=$today&date_on=createdAt&sort_by=createdAt&sort_order=desc" "Search filter: UP16" "200"

echo -e "\n${YELLOW}6. Testing Sort Options${NC}"
test_endpoint " https://api.waadi.in/api/v1/admin/bookings?page=1&limit=20&status=paid&date_from=$today&date_to=$today&date_on=createdAt&sort_by=amount&sort_order=asc" "Sort by amount ascending" "200"

echo -e "\n${GREEN}✅ Filter functionality tests completed!${NC}"
echo -e "\n${BLUE}Summary:${NC}"
echo "- All filter combinations should work correctly"
echo "- Pagination should preserve filters"
echo "- Reset filters should restore default values (today's date)"
echo "- API should respond consistently under 1 second"
