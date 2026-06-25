#!/bin/bash

echo "🎨 Testing Redesigned States Dropdown"
echo "====================================="

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

echo -e "\n${YELLOW}1. Testing States API Endpoint${NC}"
STATES_RESPONSE=$(curl -s " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/states/admin")
echo "States API Response:"
echo "$STATES_RESPONSE" | head -5

echo -e "\n${YELLOW}2. Testing No States Filter (Should Work)${NC}"
test_endpoint " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&status=paid" "No states filter" "200"

echo -e "\n${YELLOW}3. Testing Single State Filter (Backward Compatibility)${NC}"
test_endpoint " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&state_id=6891f4ae463073b51ec50c47" "Single state filter" "200"

echo -e "\n${YELLOW}4. Testing Multiple States Filter (New Implementation)${NC}"
test_endpoint " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&state_ids=6891f4ae463073b51ec50c47,6891fe63463073b51ec50e86" "Multiple states filter" "200"

echo -e "\n${YELLOW}5. Testing Empty States Array${NC}"
test_endpoint " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&state_ids=" "Empty states array" "200"

echo -e "\n${YELLOW}6. Testing States with Other Filters${NC}"
today=$(date +%Y-%m-%d)
test_endpoint " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&state_ids=6891f4ae463073b51ec50c47,6891fe63463073b51ec50e86&status=paid&date_from=$today&date_to=$today" "States with other filters" "200"

echo -e "\n${YELLOW}7. Testing Response Time${NC}"
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null " https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1/admin/bookings?page=1&limit=5&state_ids=6891f4ae463073b51ec50c47,6891fe63463073b51ec50e86")
echo "Response time: ${RESPONSE_TIME}s"

echo -e "\n${GREEN}✅ Redesigned states dropdown tests completed!${NC}"
echo -e "\n${BLUE}Frontend Features:${NC}"
echo "- Custom dropdown with checkboxes"
echo "- Visual selection indicators"
echo "- Selected state tags with remove buttons"
echo "- Clear all states option"
echo "- Click outside to close"
echo "- Responsive design"
echo "- Better accessibility"

echo -e "\n${BLUE}Backend Features:${NC}"
echo "- Multiple states filtering with \$in query"
echo "- Backward compatibility with single state_id"
echo "- Optimized database indexes"
echo "- Fast response times"
