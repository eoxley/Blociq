// Demonstration of Improved AI Assistant Responses
// This file shows how to use the enhanced response system

import { improvedResponses, improveResponse } from './improvedResponses';
import { enhanceAIResponse, getResponseByTopic, getAllTopics } from './responseEnhancer';

// Example usage of the improved response system
export function demonstrateImprovedResponses() {
  console.log('=== IMPROVED AI ASSISTANT RESPONSES ===\n');

  // Example 1: Using pre-defined improved responses
  console.log('1. C2 Remedial Works Response:');
  const c2Response = getResponseByTopic('C2 Remedial Works');
  if (c2Response) {
    console.log(`Topic: ${c2Response.topic}`);
    console.log(`Legal Context: ${c2Response.legalContext}`);
    console.log(`Next Steps: ${c2Response.nextSteps?.join(', ')}`);
    console.log(`Key Points: ${c2Response.keyPoints?.join(', ')}`);
    console.log('\nResponse Preview:');
    console.log(c2Response.response.substring(0, 200) + '...\n');
  }

  // Example 2: Enhancing an existing response
  console.log('2. Enhanced Response Example:');
  const originalResponse = "You need to handle the fire alarm upgrade. It's important to follow proper procedures.";
  const enhanced = enhanceAIResponse(originalResponse, 'Fire Alarm', 'formal');
  console.log('Original:', originalResponse);
  console.log('Enhanced:', enhanced.response.substring(0, 150) + '...\n');

  // Example 3: Different tones
  console.log('3. Tone Variations:');
  const tones = ['default', 'formal', 'friendly', 'warning'] as const;
  tones.forEach(tone => {
    const enhanced = enhanceAIResponse(originalResponse, 'Fire Alarm', tone);
    console.log(`${tone.toUpperCase()} tone: ${enhanced.response.substring(0, 100)}...`);
  });

  // Example 4: Available topics
  console.log('\n4. Available Pre-defined Topics:');
  const topics = getAllTopics();
  topics.forEach((topic, index) => {
    console.log(`${index + 1}. ${topic}`);
  });

  // Example 5: Using the improveResponse function
  console.log('\n5. Using improveResponse function:');
  const improved = improveResponse({
    id: 8,
    topic: "New Topic Example",
    oldResponse: "This is a basic response that needs improvement.",
    style: "property manager tone",
    language: "British English",
    goals: [
      "Be legally accurate",
      "Be actionable and brief where possible",
      "Include next steps or options",
      "Include law or best practice if relevant"
    ]
  });
  console.log(`Improved response for "${improved.topic}":`);
  console.log(improved.response.substring(0, 150) + '...\n');
}

// Example integration with AI system
export function integrateWithAISystem(userQuery: string, buildingContext?: string) {
  // Check if we have a pre-defined response for this query
  const topics = getAllTopics();
  const matchingTopic = topics.find(topic => 
    userQuery.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(userQuery.toLowerCase())
  );

  if (matchingTopic) {
    const response = getResponseByTopic(matchingTopic);
    if (response) {
      return {
        response: response.response,
        legalContext: response.legalContext,
        nextSteps: response.nextSteps,
        keyPoints: response.keyPoints,
        source: 'pre-defined',
        topic: matchingTopic
      };
    }
  }

  // If no pre-defined response, enhance the AI response
  return {
    response: `As the managing agent, you should address this matter professionally and in accordance with UK leasehold law and best practice.

**Key Considerations:**
- Review relevant lease terms and statutory requirements
- Consider service charge implications and consultation requirements
- Document all communications and decisions
- Ensure compliance with building regulations and safety standards

**Next Steps:**
- Gather all relevant documentation
- Consult with specialist advisors if needed
- Communicate clearly with leaseholders
- Maintain detailed records of all actions taken

**Legal Framework:**
Reference relevant UK legislation including the Landlord and Tenant Act 1985, Building Safety Act 2022, and applicable building regulations.`,
    source: 'enhanced',
    topic: 'general guidance'
  };
}

// Example usage in API route
export function exampleAPIUsage() {
  return {
    // In your API route, you could use:
    // const enhancedResponse = enhanceAIResponse(aiResponse, detectedTopic, 'default');
    // return NextResponse.json({ 
    //   response: enhancedResponse.response,
    //   nextSteps: enhancedResponse.nextSteps,
    //   legalContext: enhancedResponse.legalContext
    // });
    
    message: "This demonstrates how to integrate the improved responses into your AI API routes"
  };
}

// Export for use in other parts of the application
export { improvedResponses, enhanceAIResponse, getResponseByTopic }; 