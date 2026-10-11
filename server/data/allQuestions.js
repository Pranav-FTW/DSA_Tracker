// Every question from every sheet. Existing questions.json is the "main" sheet and stays untouched.
const main = require('./questions.json').map((q) => ({ ...q, sheet: 'main', sheetNumber: q.number }));
const a2z = require('./a2z.json'); // numbers start at 1001 so they never clash with the main sheet
module.exports = [...main, ...a2z];
