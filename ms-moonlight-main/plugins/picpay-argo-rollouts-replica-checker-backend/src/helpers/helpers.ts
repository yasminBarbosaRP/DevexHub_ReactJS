const base64Encode = (content: string): string => Buffer.from(content).toString('base64');
// eslint-disable-next-line consistent-return
const base64Decode = (content?: string, output: string = 'string'): any => {
    if (!content) {
        return '';
    }
  // eslint-disable-next-line default-case
    switch (output) {
        case 'base64':
            return content;
        case 'string':
            return Buffer.from(content, 'base64').toString();
        case 'json':
            return JSON.parse(Buffer.from(content, 'base64').toString());
    }
};

const fixedGitHubURL = (url: string): string => {

  let formated = (url || "").replace('api.github.com/repos', 'github.com');
  formated = (formated || "").replace('pulls', 'pull');
  formated = `${formated}`;

  return formated
}

export {
    base64Encode,
    base64Decode,
    fixedGitHubURL
}


