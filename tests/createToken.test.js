const hashToken = require('../utils/hashToken');
process.env.JSON_WEBTOKEN_SECRET = 'testsecretkey';

jest.mock('../models/refreshTokenModel', () => {
  return function () {
    return {
      save: jest.fn().mockResolvedValue(),
    };
  };
});

const generateToken = require('../utils/createToken');
process.env.JSON_WEBTOKEN_SECRET = 'testsecretkey';

test('generateToken returns an object with accessToken and newrefreshToken as strings', async () => {
  const user = {
    /* ... */
  };
  const result = await generateToken(user);

  expect(result).toHaveProperty('accessToken');
  expect(result).toHaveProperty('newrefreshToken');
  expect(typeof result.accessToken).toBe('string');
  expect(typeof result.newrefreshToken).toBe('string');
  expect(result.accessToken.length).toBeGreaterThan(10);
  expect(result.newrefreshToken.length).toBeGreaterThan(10);
});
