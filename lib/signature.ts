/**
 * Utility functions for generating and managing email signatures
 */

export interface UserSignature {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  signature_text?: string | null;
  signature_url?: string | null;
}

/**
 * Generate a complete email signature from user profile data
 */
export function generateEmailSignature(profile: UserSignature): string {
  if (!profile) return '';
  
  let signature = '';
  
  // Add signature text if exists
  if (profile.signature_text) {
    signature += profile.signature_text + '\n\n';
  }
  
  // Add name
  if (profile.first_name || profile.last_name) {
    signature += `${profile.first_name || ''} ${profile.last_name || ''}`.trim() + '\n';
  }
  
  // Add job title
  if (profile.job_title) {
    signature += profile.job_title + '\n';
  }
  
  // Add company name
  if (profile.company_name) {
    signature += profile.company_name + '\n';
  }
  
  // Add phone number
  if (profile.phone_number) {
    signature += `Phone: ${profile.phone_number}\n`;
  }
  
  // Add email
  if (profile.email) {
    signature += `Email: ${profile.email}\n`;
  }
  
  return signature.trim();
}

/**
 * Generate HTML email signature from user profile data
 */
export function generateHTMLEmailSignature(profile: UserSignature): string {
  if (!profile) return '';
  
  let signature = '';
  
  // Add signature text if exists
  if (profile.signature_text) {
    signature += `<p style="margin: 0 0 16px 0; font-style: italic; color: #666;">${profile.signature_text}</p>`;
  }
  
  // Add contact information
  signature += '<div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">';
  
  // Add name
  if (profile.first_name || profile.last_name) {
    signature += `<p style="margin: 0 0 4px 0; font-weight: bold; color: #111827;">${profile.first_name || ''} ${profile.last_name || ''}</p>`;
  }
  
  // Add job title
  if (profile.job_title) {
    signature += `<p style="margin: 0 0 4px 0; color: #374151;">${profile.job_title}</p>`;
  }
  
  // Add company name
  if (profile.company_name) {
    signature += `<p style="margin: 0 0 4px 0; color: #374151;">${profile.company_name}</p>`;
  }
  
  // Add contact details
  if (profile.phone_number || profile.email) {
    signature += '<div style="margin-top: 8px;">';
    if (profile.phone_number) {
      signature += `<p style="margin: 0 0 2px 0; font-size: 14px; color: #6b7280;">Phone: ${profile.phone_number}</p>`;
    }
    if (profile.email) {
      signature += `<p style="margin: 0 0 2px 0; font-size: 14px; color: #6b7280;">Email: ${profile.email}</p>`;
    }
    signature += '</div>';
  }
  
  signature += '</div>';
  
  return signature;
}

/**
 * Get user signature data from localStorage or return default
 */
export function getUserSignature(): UserSignature | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('userSignature');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save user signature data to localStorage
 */
export function saveUserSignature(signature: UserSignature): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('userSignature', JSON.stringify(signature));
  } catch {
    // Silently fail if localStorage is not available
  }
}
