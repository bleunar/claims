# CLAIMS Application - Docker Deployment Guide

## Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Build and Run
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **phpMyAdmin**: http://localhost:6700
- **MySQL Database**: localhost:3306

## Services Overview

### MySQL Database
- **Container**: `claims-mysql`
- **Port**: 3306
- **Database**: claims
- **Initial Schema**: Automatically loaded from `database/claims_schema.sql`

### phpMyAdmin
- **Container**: `claims-phpmyadmin`
- **Port**: 6700
- **Login**: Use root credentials from `.env`

### Backend API
- **Container**: `claims-backend`
- **Port**: 5000
- **Framework**: Flask with Gunicorn
- **Volumes**: 
  - `./backend/uploads` - User uploaded files
  - `./backend/logs` - Application logs

### Frontend
- **Container**: `claims-frontend`
- **Port**: 3000
- **Framework**: React + Vite
- **Server**: Nginx

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Access Service Shell
```bash
# Backend
docker-compose exec backend /bin/bash

# MySQL
docker-compose exec mysql mysql -u root -p
```

### Reset Database
```bash
# WARNING: This deletes all data!
docker-compose down -v
docker-compose up -d
```

## Volumes

### Persistent Data
- `mysql_data`: MySQL database files (persistent)
- `./backend/uploads`: User uploaded files (mounted)
- `./backend/logs`: Application logs (mounted)

### Backup Database
```bash
docker-compose exec mysql mysqldump -u root -p claims > backup.sql
```

### Restore Database
```bash
docker-compose exec -T mysql mysql -u root -p claims < backup.sql
```

## Production Deployment

### Security Recommendations
1. Change all default passwords in `.env`
2. Use strong random secrets for `SECRET_KEY` and `JWT_SECRET_KEY`
3. Update `CORS_ORIGINS` with your production domain
4. Enable HTTPS with a reverse proxy (nginx/traefik)
5. Regular database backups
6. Monitor logs for suspicious activity

### Performance Tuning
- Adjust worker count in backend Dockerfile
- Configure MySQL memory settings if needed
- Use CDN for frontend static assets
- Enable nginx gzip compression

## Troubleshooting

### Backend can't connect to MySQL
```bash
# Check if MySQL is healthy
docker-compose ps

# Check backend logs
docker-compose logs backend

# Verify environment variables
docker-compose exec backend env | grep MYSQL
```

### Frontend can't reach backend
- Check `VITE_API_URL` in docker-compose.yml
- Verify CORS settings in backend
- Check browser console for errors

### Database not initializing
```bash
# Remove volumes and recreate
docker-compose down -v
docker-compose up -d
```

## Maintenance

### Update Application
```bash
git pull
docker-compose up -d --build
```

### Clean Up
```bash
# Remove stopped containers
docker-compose down

# Remove all unused images
docker image prune -a

# Remove all unused volumes (WARNING: data loss)
docker volume prune
```
