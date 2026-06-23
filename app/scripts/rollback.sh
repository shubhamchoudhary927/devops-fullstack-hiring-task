#!/bin/bash

docker stop taskapp || true

docker rm taskapp || true

docker run -d \
--name taskapp \
-p 3000:3000 \
--env-file /home/ubuntu/.env \
taskapp:previous