# MyBrickLog Coolify Deployment Guide

## What Was Changed

The Docker configuration has been significantly simplified for Coolify deployment:

### Removed:
- Complex networking configurations (`shared_public_net`, external networks)
- SSL/TLS configuration (Coolify handles this automatically)
- Resource limits and reservations
- Duplicate CORS headers across multiple files
- Custom PHP session configuration
- Backend nginx configuration (using Apache instead)

### Simplified:
- Single `docker-compose.yml` with clean service definitions
- Streamlined CORS handling in PHP backend
- Environment variable management
- Database connection logic

## Coolify Setup Steps

### 1. Create MySQL Database Service
In your Coolify project:
1. Add a new MySQL service
2. Note the service name (you'll need this for `MBL_SQL_HOST`)
3. Import your existing database using the SQL files in the repo

### 2. Set Environment Variables
In your Coolify application settings, add these environment variables:

```bash
# Frontend Configuration (Coolify will handle the domain automatically)
REACT_APP_API_URL=/api

# Database Configuration (from your Coolify MySQL service)
MBL_SQL_HOST=your_mysql_service_name
MBL_SQL_USER=your_mysql_username
MBL_SQL_PASS=your_mysql_password
MBL_SQL_DATABASE=mybricklogdb
MBL_SQL_PORT=3306

# CORS Configuration
MBL_CORS_ORIGIN=https://your-domain.com
```

### 3. Deploy the Application
1. Connect your GitHub repository to Coolify
2. Set the build pack to Docker Compose
3. Configure the domain/subdomain
4. Deploy!

## Architecture

The simplified setup now consists of:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Coolify       │    │   Frontend      │    │   Backend       │
│   (Proxy)       │────│   (React/Nginx) │────│   (PHP/Apache)  │
│                 │    │   (Auto Port)   │    │   (Auto Port)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                              ┌─────────────────┐
                                              │   MySQL         │
                                              │   (Coolify      │
                                              │   Service)      │
                                              └─────────────────┘
```

## How It Works

1. **Coolify** handles SSL termination and proxying
2. **Frontend container** serves the React app and proxies `/api/*` requests to backend
3. **Backend container** runs PHP with Apache, handles API requests
4. **MySQL service** is managed separately by Coolify

## Troubleshooting

### Database Connection Issues
- Check that `MBL_SQL_HOST` matches your MySQL service name in Coolify
- Verify database credentials are correct
- Ensure the database exists and has the correct tables

### CORS Issues
- Make sure `MBL_CORS_ORIGIN` includes your domain
- Check that the frontend is accessing the correct API URL

### Build Issues
- Ensure all environment variables are set before deployment
- Check Coolify build logs for specific errors

## Development vs Production

For local development on Windows with WAMP:
1. Use `npm start` for the frontend
2. Point `REACT_APP_API_URL` to your local WAMP server
3. Configure WAMP to connect to your remote database

For Coolify production:
1. Everything runs in containers
2. Database is local to the Coolify instance
3. SSL and domain management is automatic 