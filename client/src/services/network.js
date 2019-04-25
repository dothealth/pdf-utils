const ENDPOINT = 'http://localhost:5051';

export function get(url, options = {}) {
  const headers = {};
  headers['Content-Type'] = 'application/json';
  return fetch(ENDPOINT + url, {
    headers,
    ...options
  }).then((response) => {
    if (!response.ok) {
      return Promise.reject('error')
    }
    return response.json();
  })
}

export function download(url, options = {}) {
  return fetch(ENDPOINT + url, {
    ...options
  }).then((response) => {
    if (!response.ok) {
      return Promise.reject('error')
    }
    return response.blob();
  })
}

export function upload(url, file, data={}, blob = false) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const xhr = new XMLHttpRequest();

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });

    formData.append('file', file, file.name);
    if (blob) {
      xhr.responseType = 'blob';
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {

          let response;
          try {
            response = JSON.parse(xhr.response);
            resolve(response);
          } catch (err) {
            resolve(xhr.response)
          }
        } else {
          reject(xhr.response);
        }
      }
    };

    xhr.open('POST', `${ENDPOINT}${url}`, true);
    xhr.send(formData);
  });
}