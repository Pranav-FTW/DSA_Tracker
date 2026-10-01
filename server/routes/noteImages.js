const express = require('express');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const NoteImage = require('../models/NoteImage');
const auth = require('../middleware/auth');
const cloud = require('../utils/cloudinary');

const router = express.Router();
router.use(auth);

const MAX_PER_QUESTION = 2;

const requireCloudinary = (_req, res, next) =>
  cloud.isConfigured() ? next() : res.status(503).json({ message: 'Photo uploads are not set up on the server yet.' });

const toDto = (i) => ({ id: i._id, url: cloud.fullUrl(i.publicId, i.version), thumb: cloud.thumbUrl(i.publicId, i.version), createdAt: i.createdAt });

// Your photos for one question.
router.get('/:questionId', requireCloudinary, async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    const images = await NoteImage.find({ user: req.user._id, question: questionId }).sort({ createdAt: 1 }).lean();
    res.json({ images: images.map(toDto) });
  } catch (err) {
    next(err);
  }
});

// Step 1: get a signed permit so the browser can upload ONE photo straight to Cloudinary.
router.post('/:questionId/sign', requireCloudinary, async (req, res, next) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    if (!(await Question.exists({ _id: questionId }))) return res.status(404).json({ message: 'Question not found.' });

    const count = await NoteImage.countDocuments({ user: req.user._id, question: questionId });
    if (count >= MAX_PER_QUESTION) return res.status(400).json({ message: `You can attach up to ${MAX_PER_QUESTION} photos per question.` });

    res.json(cloud.createUploadSignature());
  } catch (err) {
    next(err);
  }
});

// Step 2: after the upload succeeded, save it. Body: { publicId, version }
router.post('/:questionId', requireCloudinary, async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { publicId, version } = req.body || {};
    if (!mongoose.isValidObjectId(questionId)) return res.status(400).json({ message: 'Invalid question id.' });
    if (!cloud.isValidPublicId(publicId) || !Number.isInteger(version) || version <= 0) return res.status(400).json({ message: 'Invalid photo data.' });
    if (!(await Question.exists({ _id: questionId }))) return res.status(404).json({ message: 'Question not found.' });
    if (await NoteImage.exists({ publicId })) return res.status(409).json({ message: 'That photo is already saved.' });

    // Make sure the file really is on Cloudinary before we record it.
    if (!(await cloud.imageExists(publicId, version))) return res.status(400).json({ message: 'Upload could not be verified. Please try again.' });

    // The limit is re-checked here because several permits could have been requested at once.
    const count = await NoteImage.countDocuments({ user: req.user._id, question: questionId });
    if (count >= MAX_PER_QUESTION) {
      cloud.destroyImage(publicId).catch(() => {});
      return res.status(400).json({ message: `You can attach up to ${MAX_PER_QUESTION} photos per question.` });
    }

    const doc = await NoteImage.create({ user: req.user._id, question: questionId, publicId, version });
    res.status(201).json({ image: toDto(doc), count: count + 1 });
  } catch (err) {
    next(err);
  }
});

// Delete one of your photos (also removes it from Cloudinary).
router.delete('/:imageId', requireCloudinary, async (req, res, next) => {
  try {
    const { imageId } = req.params;
    if (!mongoose.isValidObjectId(imageId)) return res.status(400).json({ message: 'Invalid image id.' });
    const img = await NoteImage.findOneAndDelete({ _id: imageId, user: req.user._id });
    if (!img) return res.status(404).json({ message: 'Photo not found.' });

    cloud.destroyImage(img.publicId).catch((e) => console.error('Cloudinary delete failed:', e.message));
    const count = await NoteImage.countDocuments({ user: req.user._id, question: img.question });
    res.json({ message: 'Photo deleted.', count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
