const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64ToBytes = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const bytesToBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes)));

export const createKeyMaterial = () => crypto.getRandomValues(new Uint8Array(32));

export const importKey = async (raw: Uint8Array) =>
  crypto.subtle.importKey("raw", raw.slice().buffer, "AES-GCM", true, ["encrypt", "decrypt"]);

export const exportKey = async (key: CryptoKey) => {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(new Uint8Array(raw));
};

export const getKeyFromBase64 = async (base64: string) => importKey(base64ToBytes(base64));

export const encryptString = async (value: string, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  const payload = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return bytesToBase64(payload);
};

export const decryptString = async (payload: string, key: CryptoKey) => {
  const bytes = base64ToBytes(payload);
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(decrypted);
};
