# SETUP_GUIDE.md

## 1. Setting up `.env` files
- Copy `.env.example` to `.env`
- Fill in the values

## 2. Setting up secrets
- rename all files inside the `secret` directory by removing the `_` prefix
- fill in the values


Management

## - Running the stack
- run `sudo docker compose up -d`

## - Stopping the stack
- run `sudo docker compose down`

## - Using the management script (`manage.sh`)
- run `sudo ./manage.sh`