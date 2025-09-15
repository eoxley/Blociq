import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Add request timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 25000) // 25 second timeout
    );

    const processRequest = async () => {
      const body = await req.json();
      const { prompt, token, emailContext, is_outlook_addin } = body;

      if (!prompt) {
        return NextResponse.json({
          success: false,
          error: 'Prompt is required'
        }, { status: 400 });
      }

      if (!token) {
        return NextResponse.json({
          success: false,
          error: 'Authentication token is required'
        }, { status: 401 });
      }

      return { body, prompt, token, emailContext, is_outlook_addin };
    };

    const result = await Promise.race([processRequest(), timeoutPromise]);
    const { body, prompt, token, emailContext, is_outlook_addin } = result as any;

    // Validate token (simplified for development)
    let user: any;

    // Check if it's a temporary email-based token
    if (token.length > 100) { // Base64 encoded token
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());

        if (tokenData.context === 'outlook_email_auth' && tokenData.timestamp) {
          // Check if token is not too old (24 hours)
          const tokenAge = Date.now() - tokenData.timestamp;
          if (tokenAge > 24 * 60 * 60 * 1000) {
            return NextResponse.json({
              success: false,
              error: 'Email authentication token expired'
            }, { status: 401 });
          }

          // Create a user object for temporary email authentication
          user = {
            id: tokenData.user_id,
            email: tokenData.email,
            user_metadata: {
              full_name: tokenData.email.split('@')[0]
            }
          };
        } else {
          return NextResponse.json({
            success: false,
            error: 'Invalid email token format'
          }, { status: 401 });
        }
      } catch (e) {
        console.warn('Invalid temporary token:', e);
        return NextResponse.json({
          success: false,
          error: 'Invalid token format'
        }, { status: 401 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid token format'
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 });
    }

    console.log('🚀 Processing Outlook add-in query for user:', user.email);

    // Simple development mode response to avoid complex processing hanging
    if (process.env.NODE_ENV === 'development' && user.id?.startsWith('dev-user')) {
      console.log('🔧 Development mode: returning simple response');

      const simpleResponse = `Hello! I received your message: "${prompt}"\n\nThis is a development test response from BlocIQ AI Assistant. In production, I would provide detailed property management guidance based on your query.\n\n📊 **Source:** Development test mode`;

      return NextResponse.json({
        success: true,
        response: simpleResponse,
        systemVersion: 'outlook_addin_dev_v1',
        queryType: 'development_test',
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email
        },
        metadata: {
          processingTime: Date.now(),
          hasEmailContext: !!emailContext,
          isOutlookAddin: is_outlook_addin,
          developmentMode: true
        }
      });
    }

    // For production, return a placeholder response
    return NextResponse.json({
      success: true,
      response: `I received your question: "${prompt}". In a full production environment, I would provide detailed property management assistance. Please contact support for full functionality.`,
      systemVersion: 'outlook_addin_simple_v1',
      queryType: 'placeholder',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email
      },
      metadata: {
        processingTime: Date.now(),
        hasEmailContext: !!emailContext,
        isOutlookAddin: is_outlook_addin
      }
    });

  } catch (error: any) {
    console.error('Outlook add-in API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message,
      systemVersion: 'outlook_addin_v1',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}