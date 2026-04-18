#!/bin/bash

echo "Building and deploying FoodShare..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build

# Go back to root
cd ..

# Commit and push
echo "Committing changes..."
git add .
git commit -m "Build frontend and update server to serve static files"
git push

echo "Deployment complete!"
echo "Visit: https://foodshare-g77c.onrender.com"
