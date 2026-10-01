// Minimal Cloudinary helper (no npm package needed): signs browser uploads, builds image URLs, deletes images.
// Env vars (set them on the Vercel BACKEND project): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
const crypto = require('crypto');

const FOLDER = 'dsa-tracker/notes';
// Applied by Cloudinary itself when the photo is uploaded: caps the longest side at 1600px.
const INCOMING_TRANSFORMATION = 'c_limit,h_1600,w_1600';
const THUMB = 'c_fill,h_240,w_240,q_auto';

const config = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});
const isConfigured = () => {
  const c = config();
  return !!(c.cloudName && c.apiKey && c.apiSecret);
};

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

// Cloudinary signature: sorted "key=value" pairs joined by "&", then the API secret appended, then SHA-1.
function signParams(params, secret) {
  const str = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return sha1(str + secret);
}

// Random, unguessable id chosen by the server (the browser can't pick its own).
const newPublicId = () => `${FOLDER}/${crypto.randomBytes(16).toString('hex')}`;
const isValidPublicId = (id) => typeof id === 'string' && new RegExp(`^${FOLDER}/[a-f0-9]{32}$`).test(id);

// Everything the browser needs to upload one photo straight to Cloudinary.
function createUploadSignature() {
  const { cloudName, apiKey, apiSecret } = config();
  const publicId = newPublicId();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, transformation: INCOMING_TRANSFORMATION };
  return { cloudName, apiKey, publicId, timestamp, transformation: INCOMING_TRANSFORMATION, signature: signParams(params, apiSecret) };
}

function imageUrl(publicId, version, transformation) {
  const { cloudName } = config();
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation ? transformation + '/' : ''}v${version}/${publicId}.jpg`;
}
const fullUrl = (publicId, version) => imageUrl(publicId, version);
const thumbUrl = (publicId, version) => imageUrl(publicId, version, THUMB);

async function destroyImage(publicId) {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, invalidate: 'true' };
  const body = new URLSearchParams({ ...params, api_key: apiKey, signature: signParams(params, apiSecret) });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body });
  return res.ok;
}

// True if the image really exists on Cloudinary (used to verify an upload before saving it).
async function imageExists(publicId, version) {
  try {
    const res = await fetch(fullUrl(publicId, version), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = { isConfigured, signParams, createUploadSignature, isValidPublicId, fullUrl, thumbUrl, destroyImage, imageExists };
