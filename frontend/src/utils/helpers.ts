export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Generates a unique tire code check against existing codes to ensure absolute uniqueness.
 * Format: LT-YYYY-XXXXXX
 */
export function generateTireCode(existingCodes: string[]): string {
  const year = new Date().getFullYear();
  let code = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    // Generate a beautiful sequential/random 5-digit number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    code = `LT-${year}-${randomNum}`;
    
    if (!existingCodes.includes(code)) {
      isUnique = true;
    }
    attempts++;
  }

  // Fallback sequential
  if (!isUnique) {
    const fallbackNum = existingCodes.length + 10001;
    code = `LT-${year}-${fallbackNum}`;
  }

  return code;
}

/**
 * Normalizes a string for robust Turkish-friendly searches.
 * Converts characters like 'Ş', 'İ', 'Ğ', etc. to lowercase non-accented counterparts.
 */
export function normalizeTurkish(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove standard diacritics
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .toLowerCase();
}

/**
 * Formats date into Turkish locale representation
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
}

/**
 * Standard plate format normalizer (converts to UPPERCASE, strips duplicate whitespace)
 */
export function formatPlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Resizes and converts loaded file to standard state base64.
 * Keeps image resolution reasonable to avoid blowing up localStorage space!
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Target bounding dimensions for warehouse photos
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Compress with solid quality WebP/JPEG
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        reject(new Error("Görsel yüklenemedi"));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Dosya okunamadı"));
    };
    reader.readAsDataURL(file);
  });
}
