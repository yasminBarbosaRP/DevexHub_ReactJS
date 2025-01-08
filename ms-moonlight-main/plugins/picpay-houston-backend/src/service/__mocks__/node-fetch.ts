const fetch = jest.fn();

const resData = Promise.resolve({
  ok: true,
  status: 200,
  json: () => ({
    flagBool: { value: 'true' },
    flagJSON: { value: JSON.stringify({ teste: 123 }) },
    flagString: { value: 'string' },
  }),
});

fetch.mockImplementation(() => resData);

export default fetch;
