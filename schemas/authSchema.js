const z = require("zod");

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name can't be more that 50 characters"),
  email: z
    .email()
    .min(5, "Email is too short.")
    .max(100, "Email can't be more than 100 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password can't be more than 100 characters."),
});

const loginSchema = z.object({
  email: z
    .email()
    .min(5, "Email is too short.")
    .max(100, "Email can't be more than 100 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password can't be more than 100 characters."),
});

module.exports = { registerSchema, loginSchema };
