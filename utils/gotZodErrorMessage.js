function getZodErrorMessage(result) {
  if (
    result &&
    result.error &&
    Array.isArray(result.error.errors) &&
    result.error.errors.length
  ) {
    return result.error.errors.map((e) => e.message).join("; ");
  }
  return "Invalid input.";
}
