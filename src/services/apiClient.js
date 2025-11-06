export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const parseJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await response.json();
  } catch (error) {
    console.warn('Failed to parse JSON response', error);
    return null;
  }
};

const handleResponse = async (response) => {
  const payload = await parseJson(response);
  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'error') && payload.error) {
    throw new ApiError(payload.error, response.status, payload);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, headers, ...rest } = options;

  const init = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...headers
    },
    ...rest
  };

  if (body !== undefined) {
    if (
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer
    ) {
      init.body = body;
    } else if (typeof body === 'string') {
      init.body = body;
      init.headers['Content-Type'] =
        headers?.['Content-Type'] || 'application/json';
    } else {
      init.body = JSON.stringify(body);
      init.headers['Content-Type'] =
        headers?.['Content-Type'] || 'application/json';
    }
  }

  const response = await fetch(path, init);
  return handleResponse(response);
};

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
};
