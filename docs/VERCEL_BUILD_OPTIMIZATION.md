# Vercel Build Optimization

## 🎯 **Overview**

This project uses Vercel's `ignoreCommand` feature to skip frontend builds when only backend/API files change. This significantly reduces build time and costs for deployments that don't affect the frontend.

## 🚀 **How It Works**

### **Build Detection Logic**

The script `scripts/should-build-frontend.sh` analyzes git changes and determines whether a frontend build is needed:

```bash
# Files that TRIGGER a frontend build:
✅ app/ (excluding app/api/) - Frontend pages and components
✅ components/ - React components
✅ pages/ - Next.js pages (if using Pages Router)
✅ styles/ - CSS and styling files
✅ Configuration files (next.config, tailwind.config, etc.)
✅ Package files (package.json, lock files)
✅ Public files (excluding addin/)

# Files that do NOT trigger a frontend build:
❌ app/api/ - API routes and backend logic
❌ public/addin/ - Add-in files
❌ lib/ - Utility libraries
❌ utils/ - Helper functions
❌ Database migrations
❌ Environment files
```

### **Vercel Configuration**

The `vercel.json` file uses the `ignoreCommand` to run our detection script:

```json
{
  "version": 2,
  "ignoreCommand": "bash scripts/should-build-frontend.sh"
}
```

## 📁 **File Structure**

```
scripts/
├── should-build-frontend.sh      # Main build detection script
└── test-build-detection.sh      # Test script for verification

vercel.json                       # Vercel configuration
```

## 🧪 **Testing the System**

### **Run the Test Suite**

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Test build detection logic
bash scripts/test-build-detection.sh
```

### **Test Different Scenarios**

```bash
# Test with actual git changes
bash scripts/should-build-frontend.sh

# Simulate different file changes
echo "app/page.tsx" | bash scripts/should-build-frontend.sh
echo "app/api/test.ts" | bash scripts/should-build-frontend.sh
echo "public/addin/script.js" | bash scripts/should-build-frontend.sh
```

## 🔧 **Customization**

### **Modify Build Triggers**

Edit `scripts/should-build-frontend.sh` to adjust which files trigger builds:

```bash
# Add new frontend directories
FRONTEND_REGEX='^(components/|pages/|styles/|new-frontend-dir/|...)'

# Add new file types
if echo "$changed" | grep -q "\.css$"; then
  echo "[frontend] CSS files changed — building."
  exit 0
fi
```

### **Exclude Additional Paths**

```bash
# Exclude more backend paths
if echo "$changed" | grep -q "^app/" && ! echo "$changed" | grep -q "^app/(api|admin)/"; then
  echo "[frontend] App files changed (excluding API/admin) — building."
  exit 0
fi
```

## 📊 **Expected Behavior**

### **Builds WILL Trigger When:**
- Frontend components change (`components/Button.tsx`)
- Pages change (`app/dashboard/page.tsx`)
- Styles change (`styles/globals.css`)
- Configuration changes (`next.config.js`)
- Public assets change (`public/logo.png`)

### **Builds Will NOT Trigger When:**
- Only API routes change (`app/api/users/route.ts`)
- Only add-in files change (`public/addin/script.js`)
- Only utility functions change (`lib/utils.ts`)
- Only database migrations change (`supabase/migrations/`)
- Only environment variables change (`.env.local`)

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Script not executable**
   ```bash
   chmod +x scripts/should-build-frontend.sh
   ```

2. **Regex syntax errors**
   - Use simple patterns: `^app/` instead of complex lookaheads
   - Test regex patterns separately before adding to script

3. **Path mismatches**
   - Ensure regex patterns match your actual file structure
   - Use `find . -type f` to see actual paths

### **Debug Mode**

Add debug output to the script:

```bash
# Add to should-build-frontend.sh
echo "Debug: Changed files:" >&2
echo "$changed" >&2
echo "Debug: Checking regex: $FRONTEND_REGEX" >&2
```

## 📈 **Performance Impact**

### **Before Optimization**
- **Every commit** triggers a full build
- **Build time**: 5-10 minutes
- **Cost**: Higher due to unnecessary builds

### **After Optimization**
- **Selective builds** based on file changes
- **Build time**: 0-10 minutes (depending on changes)
- **Cost**: Lower due to reduced unnecessary builds

### **Typical Scenarios**

| Change Type | Build Time | Cost Impact |
|-------------|------------|-------------|
| Frontend component | 5-10 min | Normal |
| API route only | 0 min | Saved |
| Add-in file only | 0 min | Saved |
| Mixed changes | 5-10 min | Normal |

## 🔄 **Maintenance**

### **Regular Updates**

1. **Review build triggers** monthly
2. **Test with new file types** when adding features
3. **Update documentation** when changing logic

### **Monitoring**

- Check Vercel build logs for skipped builds
- Verify that frontend changes still trigger builds
- Monitor for false positives/negatives

## 📚 **References**

- [Vercel ignoreCommand Documentation](https://vercel.com/docs/projects/project-configuration#ignorecommand)
- [Git Diff Documentation](https://git-scm.com/docs/git-diff)
- [Bash Scripting Guide](https://tldp.org/LDP/abs/html/)

## 🤝 **Contributing**

When modifying the build detection logic:

1. **Test thoroughly** with different file types
2. **Update tests** in `test-build-detection.sh`
3. **Document changes** in this README
4. **Verify** that the script works in your environment
