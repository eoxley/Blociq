const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Local Supabase Development Environment...')

// Check if .env.local exists
const envLocalPath = path.join(process.cwd(), '.env.local')
const envLocalDevPath = path.join(process.cwd(), '.env.local.dev')

// Local Supabase configuration
const localSupabaseConfig = `# Local Supabase Development Settings
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Other settings (keeping existing ones)
OPENAI_API_KEY=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
MICROSOFT_TENANT_ID=558a1a95-d1ce-42bf-875e-9e9af0c15d56
MICROSOFT_CLIENT_ID=f8033f58-1b3b-40a7-8f0c-86678499cc74
MICROSOFT_CLIENT_SECRET=-V_8Q~vfM31wtpeSmnjndGESekdY7KHULaK2ua-R
MICROSOFT_USER_EMAIL=testbloc@blociq.co.uk
GOOGLE_APPLICATION_CREDENTIALS=./gcloud-key.json
SYNC_API_KEY=secure-blociq-key-123
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
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
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