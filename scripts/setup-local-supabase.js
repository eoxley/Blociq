const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Local Supabase Development Environment...')

// Check if .env.local exists
const envLocalPath = path.join(process.cwd(), '.env.local')
const envLocalDevPath = path.join(process.cwd(), '.env.local.dev')

// Local Supabase configuration
const localSupabaseConfig = `# Local Supabase Development Settings
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key-here

# Other settings (keeping existing ones)
OPENAI_API_KEY=sk-placeholder-replace-with-actual-key
MICROSOFT_TENANT_ID=placeholder-tenant-id
MICROSOFT_CLIENT_ID=placeholder-client-id
MICROSOFT_CLIENT_SECRET=placeholder-client-secret
MICROSOFT_USER_EMAIL=placeholder-email@example.com
GOOGLE_APPLICATION_CREDENTIALS=./gcloud-key.json
SYNC_API_KEY=placeholder-sync-api-key
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/outlook/callback
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:3000/api/outlook/callback
`

// Check if Supabase CLI is available
async function checkSupabaseCLI() {
  const { exec } = require('child_process')
  const util = require('util')
  const execAsync = util.promisify(exec)
  
  try {
    await execAsync('supabase --version')
    console.log('✅ Supabase CLI is installed')
    return true
  } catch (error) {
    console.log('❌ Supabase CLI is not installed')
    console.log('📦 Installing Supabase CLI...')
    
    try {
      await execAsync('npm install -g @supabase/cli')
      console.log('✅ Supabase CLI installed successfully')
      return true
    } catch (installError) {
      console.log('❌ Failed to install Supabase CLI')
      console.log('💡 Please install manually: https://supabase.com/docs/guides/cli')
      return false
    }
  }
}

// Start local Supabase
async function startLocalSupabase() {
  const { exec } = require('child_process')
  const util = require('util')
  const execAsync = util.promisify(exec)
  
  try {
    console.log('🚀 Starting local Supabase...')
    await execAsync('supabase start')
    console.log('✅ Local Supabase started successfully')
    console.log('🌐 Supabase Studio: http://localhost:54323')
    console.log('🔗 API URL: http://localhost:54321')
    console.log('🗄️ Database URL: postgresql://postgres:postgres@localhost:54322/postgres')
    return true
  } catch (error) {
    console.log('❌ Failed to start local Supabase')
    console.log('💡 Please run manually: supabase start')
    return false
  }
}

// Create environment file
function createEnvFile() {
  try {
    if (fs.existsSync(envLocalPath)) {
      console.log('📝 Backing up existing .env.local to .env.local.backup')
      fs.copyFileSync(envLocalPath, envLocalPath + '.backup')
    }
    
    fs.writeFileSync(envLocalPath, localSupabaseConfig)
    console.log('✅ Created .env.local with local Supabase configuration')
    return true
  } catch (error) {
    console.log('❌ Failed to create .env.local file')
    console.log('💡 Please create manually with the following content:')
    console.log(localSupabaseConfig)
    return false
  }
}

// Test connection
async function testConnection() {
  const { createClient } = require('@supabase/supabase-js')
  
  try {
    const supabase = createClient(
      'http://localhost:54321',
      'placeholder-local-anon-key'
    )
    
    const { data, error } = await supabase.from('buildings').select('*').limit(1)
    
    if (error) {
      console.log('⚠️ Connection test failed:', error.message)
      return false
    } else {
      console.log('✅ Connection to local Supabase successful')
      return true
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
    return false
  }
}

// Main setup function
async function setupLocalSupabase() {
  console.log('\n📋 Step 1: Checking Supabase CLI...')
  const cliAvailable = await checkSupabaseCLI()
  
  if (cliAvailable) {
    console.log('\n📋 Step 2: Creating environment file...')
    createEnvFile()
    
    console.log('\n📋 Step 3: Starting local Supabase...')
    const started = await startLocalSupabase()
    
    if (started) {
      console.log('\n📋 Step 4: Testing connection...')
      await testConnection()
    }
  }
  
  console.log('\n🎉 Setup complete!')
  console.log('\n📝 Next steps:')
  console.log('1. Run: npm run dev')
  console.log('2. Open: http://localhost:3000')
  console.log('3. Supabase Studio: http://localhost:54323')
  console.log('4. To stop: supabase stop')
}

// Run the setup
setupLocalSupabase().catch(console.error) 