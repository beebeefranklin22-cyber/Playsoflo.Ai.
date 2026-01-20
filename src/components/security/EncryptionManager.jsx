// Client-side encryption utilities for sensitive data
export class EncryptionManager {
  static async generateKey() {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptData(data, key) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  static async decryptData(encryptedData, iv, key) {
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  }

  // Hash sensitive data (one-way)
  static async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify hash
  static async verifyHash(data, hash) {
    const computedHash = await this.hashData(data);
    return computedHash === hash;
  }

  // Secure random token generation
  static generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // Store encrypted data in localStorage
  static async storeEncrypted(key, data, encryptionKey) {
    const { encrypted, iv } = await this.encryptData(data, encryptionKey);
    localStorage.setItem(`${key}_data`, encrypted);
    localStorage.setItem(`${key}_iv`, iv);
  }

  // Retrieve encrypted data from localStorage
  static async retrieveEncrypted(key, encryptionKey) {
    const encrypted = localStorage.getItem(`${key}_data`);
    const iv = localStorage.getItem(`${key}_iv`);
    
    if (!encrypted || !iv) return null;
    
    try {
      return await this.decryptData(encrypted, iv, encryptionKey);
    } catch (err) {
      console.error('Decryption failed:', err);
      return null;
    }
  }

  // Clear encrypted storage
  static clearEncrypted(key) {
    localStorage.removeItem(`${key}_data`);
    localStorage.removeItem(`${key}_iv`);
  }
}

// CSRF token management
export class CSRFProtection {
  static getToken() {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
      token = EncryptionManager.generateSecureToken();
      sessionStorage.setItem('csrf_token', token);
    }
    return token;
  }

  static validateToken(token) {
    return token === this.getToken();
  }

  static refreshToken() {
    const token = EncryptionManager.generateSecureToken();
    sessionStorage.setItem('csrf_token', token);
    return token;
  }
}

// Content Security Policy helper
export class CSPManager {
  static applySecurityHeaders() {
    // These would typically be set on the server, but we can add meta tags
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    document.head.appendChild(meta);
  }
}

export default EncryptionManager;