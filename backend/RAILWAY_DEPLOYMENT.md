# Railway Deployment Guide

## 🚀 Deploy Index Order Server to Railway

This guide walks you through deploying the Index Order Server to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **1inch API Key**: Get one from [1inch Developer Portal](https://portal.1inch.dev/)
3. **Git Repository**: Your code should be in a Git repository

## Deployment Steps

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Choose the `backend` folder as the root directory

### 2. Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```bash
# Required
ONEINCH_API_KEY=your_1inch_api_key_here

# Optional
PRIVATE_KEY=your_private_key_here_if_needed
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Railway Auto-Configuration

Railway will automatically:
- Set `PORT` environment variable
- Set `RAILWAY_STATIC_URL` with your app's URL
- Install dependencies from `package.json`
- Run `npm start` to start the server

### 4. Custom Domain (Optional)

1. In Railway dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Add your domain to `FRONTEND_URL` environment variable

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ONEINCH_API_KEY` | ✅ Yes | 1inch API key for SDK operations | `abc123...` |
| `PRIVATE_KEY` | ❌ No | Private key for backend operations | `0x123...` |
| `FRONTEND_URL` | ❌ No | Frontend domain for CORS | `https://app.com` |
| `PORT` | ❌ No | Auto-set by Railway | `3000` |
| `RAILWAY_STATIC_URL` | ❌ No | Auto-set by Railway | `app.railway.app` |

## Testing Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app.railway.app/health

# Get indices
curl https://your-app.railway.app/indices

# Get operators
curl https://your-app.railway.app/operators
```

## Update Frontend Configuration

After deployment, update your frontend to use the Railway URL:

```typescript
// In your frontend code, replace localhost:3001 with Railway URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.railway.app'
  : 'http://localhost:3001';
```

## Monitoring

Railway provides:
- **Logs**: View real-time application logs
- **Metrics**: CPU, memory, and network usage
- **Deployments**: Track deployment history
- **Health Checks**: Automatic health monitoring

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check `package.json` has all dependencies
   - Verify Node.js version compatibility

2. **CORS Errors**
   - Add your frontend domain to `FRONTEND_URL`
   - Check CORS configuration in server

3. **API Key Issues**
   - Verify `ONEINCH_API_KEY` is set correctly
   - Check 1inch API key is valid

4. **Port Issues**
   - Server automatically uses Railway's `PORT`
   - Don't hardcode port 3001 in production

### View Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and view logs
railway login
railway logs
```

## Security Notes

- Never commit `.env` files to Git
- Use Railway's environment variables for secrets
- Monitor API usage to prevent quota limits
- Enable Railway's security features

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **1inch Docs**: [docs.1inch.io](https://docs.1inch.io)

---

Your Index Order Server is now ready for production on Railway! 🎉