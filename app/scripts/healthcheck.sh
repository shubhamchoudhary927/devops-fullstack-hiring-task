#!/bin/bash

URL=http://localhost:3000/health

for i in {1..3}
do

response=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ "$response" = "200" ]
then
echo "Healthy"

exit 0

fi

sleep 10

done

echo "Unhealthy"

exit 1