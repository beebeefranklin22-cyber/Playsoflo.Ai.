// Simple encryption utility for messages
// In production, use a proper E2E encryption library like Signal Protocol

export class MessageEncryption {
  static async generateKey() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  static async exportKey(key) {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  static async importKey(keyData) {
    const keyObject = JSON.parse(keyData);
    return await crypto.subtle.importKey(
      'jwk',
      keyObject,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  static async decrypt(encryptedData, key) {
    const decoder = new TextDecoder();
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return decoder.decode(decrypted);
  }
}