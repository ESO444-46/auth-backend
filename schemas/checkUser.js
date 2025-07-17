const z = require('zod');

const checkUserSchema = z.object({
  email: z.email().min(5).max(100),
});

module.exports = checkUserSchema;
