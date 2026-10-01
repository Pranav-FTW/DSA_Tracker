// Shrinks a photo in the browser before upload (phone photos are 3-8 MB; we send a few hundred KB).
// Returns a JPEG Blob. Long edge is capped so handwriting stays readable.
const MAX_BYTES = 2 * 1024 * 1024;

function load(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Try a JPG or PNG photo.'));
    };
    img.src = url;
  });
}

const toBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const img = await load(file);

  let maxEdge = 1600;
  let quality = 0.82;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // PNGs with transparency would turn black in JPEG otherwise
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
    maxEdge = Math.round(maxEdge * 0.8);
    quality = Math.max(0.6, quality - 0.06);
  }
  throw new Error('This photo is too large to upload. Try a smaller one.');
}

// Sends the photo straight to Cloudinary using the signed permit from our backend.
// (Plain fetch on purpose: our axios instance adds an Authorization header that Cloudinary doesn't accept.)
export async function uploadToCloudinary(blob, permit) {
  const form = new FormData();
  form.append('file', blob);
  form.append('api_key', permit.apiKey);
  form.append('timestamp', permit.timestamp);
  form.append('public_id', permit.publicId);
  form.append('transformation', permit.transformation);
  form.append('signature', permit.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${permit.cloudName}/image/upload`, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || 'Photo upload failed. Try again.');
  return { publicId: json.public_id, version: json.version };
}
