# Fix Outlook OAuth Redirect URI in Azure Portal

## 🚨 **Issue Identified**

The Outlook OAuth is failing because of a redirect URI mismatch:

- **Application sends**: `https://www.blociq.co.uk/api/auth/outlook/callback` (with `www`)
- **Azure Portal expects**: `https://blociq.co.uk/api/auth/outlook/callback` (without `www`)

## 🔧 **Solution: Update Azure Portal App Registration**

### **Step 1: Go to Azure Portal**
1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Go to **App registrations**
4. Find your BlocIQ app registration

### **Step 2: Update Redirect URIs**
1. Click on your app registration
2. Go to **Authentication** in the left menu
3. Under **Redirect URIs**, you should see:
   - ❌ `https://blociq.co.uk/api/auth/outlook/callback` (incorrect)
4. **Add the correct URI**:
   - ✅ `https://www.blociq.co.uk/api/auth/outlook/callback` (correct)
5. **Remove the incorrect URI** (without `www`)
6. Click **Save**

### **Step 3: Verify the Fix**
1. The redirect URIs should now show:
   - ✅ `https://www.blociq.co.uk/api/auth/outlook/callback`
2. Save the changes
3. Wait 1-2 minutes for changes to propagate

### **Step 4: Test the Connection**
1. Go to your BlocIQ application
2. Try connecting Outlook again
3. The OAuth flow should now work correctly

## 📋 **Current Environment Variables (Correct)**
```
MICROSOFT_REDIRECT_URI=https://www.blociq.co.uk/api/auth/outlook/callback
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://www.blociq.co.uk/api/auth/outlook/callback
```

## ✅ **Expected Result**
After updating the Azure Portal:
- OAuth initiation will use: `https://www.blociq.co.uk/api/auth/outlook/callback`
- Token exchange will use: `https://www.blociq.co.uk/api/auth/outlook/callback`
- Both URIs will match and the connection will succeed

## 🚨 **Important Notes**
- The redirect URI must **exactly match** what's in the Azure Portal
- Changes to Azure Portal can take 1-2 minutes to propagate
- Make sure to use `https://` (not `http://`)
- Make sure to include the full path `/api/auth/outlook/callback`
