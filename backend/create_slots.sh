#!/bin/bash

SCHOOL_ID="133ebcbc-bf3c-46a5-a570-bbbf15aaf4b9"
BASE_URL="http://localhost:8001/api/v1/time-slots/"

# Days (Monday to Friday)
days=("monday" "tuesday" "wednesday" "thursday" "friday")

# Create time slot function
create_slot() {
    local day=$1
    local period=$2
    local start=$3
    local end=$4
    local is_break=$5
    local label=$6

    curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"school_id\": \"$SCHOOL_ID\",
            \"day\": \"$day\",
            \"period_number\": $period,
            \"start_time\": \"$start\",
            \"end_time\": \"$end\",
            \"is_break\": $is_break,
            \"label\": \"$label\",
            \"is_active\": true
        }" > /dev/null

    if [ $? -eq 0 ]; then
        echo "  [OK] $label ($start-$end)"
    else
        echo "  [ERROR] $label"
    fi
}

# Loop through days
for day in "${days[@]}"; do
    echo ""
    echo "${day^} icin time slot'lar olusturuluyor..."

    # 1. Ders
    create_slot "$day" 1 "08:00" "08:45" false "1. Ders"
    create_slot "$day" 2 "08:45" "08:55" true "Teneffus"

    # 2. Ders
    create_slot "$day" 3 "08:55" "09:40" false "2. Ders"
    create_slot "$day" 4 "09:40" "10:00" true "Uzun Teneffus"

    # 3. Ders
    create_slot "$day" 5 "10:00" "10:45" false "3. Ders"
    create_slot "$day" 6 "10:45" "10:55" true "Teneffus"

    # 4. Ders
    create_slot "$day" 7 "10:55" "11:40" false "4. Ders"
    create_slot "$day" 8 "11:40" "11:50" true "Teneffus"

    # 5. Ders
    create_slot "$day" 9 "11:50" "12:35" false "5. Ders"
    create_slot "$day" 10 "12:35" "13:35" true "Ogle Yemegi"

    # 6. Ders
    create_slot "$day" 11 "13:35" "14:20" false "6. Ders"
    create_slot "$day" 12 "14:20" "14:30" true "Teneffus"

    # 7. Ders
    create_slot "$day" 13 "14:30" "15:15" false "7. Ders"
    create_slot "$day" 14 "15:15" "15:25" true "Teneffus"

    # 8. Ders
    create_slot "$day" 15 "15:25" "16:10" false "8. Ders"
done

echo ""
echo "=================================================="
echo "Time slot'lar olusturuldu!"
echo "=================================================="
