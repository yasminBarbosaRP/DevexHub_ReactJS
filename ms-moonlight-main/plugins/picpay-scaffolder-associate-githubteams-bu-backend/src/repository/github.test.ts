import GithubRepository from './GithubRepository';

describe('GithubRepository', () => {
  it('should initialize repository successfully', () => {
    const Octokit = jest.fn();
    const githubApi = new Octokit();
    const repository = new GithubRepository(githubApi);

    expect(repository).toBeInstanceOf(GithubRepository);
  });

  it('Should get content repo', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        request: jest.fn(() => {
          return {
            data: [
              {
                name: 'tech-cross-bu.yaml',
                path: 'picpay/tech_cross/tech-cross-bu.yaml',
                sha: '53e326359b4526ed77182aece1b15ad186ef1249',
                size: 596,
                url: 'https://api.github.com/repos/PicPay/moonlight-org/contents/picpay/tech_cross/tech-cross-bu.yaml?ref=main',
                html_url:
                  'https://github.com/PicPay/moonlight-org/blob/main/picpay/tech_cross/tech-cross-bu.yaml',
                git_url:
                  'https://api.github.com/repos/PicPay/moonlight-org/git/blobs/53e326359b4526ed77182aece1b15ad186ef1249',
                download_url: 'https://download_url',
                type: 'file',
                content:
                  'YXBpVmVyc2lvbjogYmFja3N0YWdlLmlvL3YxYWxwaGExCmtpbmQ6IEdyb3Vw\nCm1ldGFkYXRhOgogIG5hbWU6IHRlY2hfY3Jvc3MKICBkZXNjcmlwdGlvbjog\nIkJVIHJlc3BvbnPDoXZlbCBwZWxhcyBmcmVudGVzIGRlIFByb2R1Y3Rpb24g\nRW5naW5lZXJpbmcsIEdvdmVybmFuw6dhIGUgU2VjdXJpdHkgUGxhdGZvcm0i\nCnNwZWM6CiAgcHJvZmlsZToKICAgIGRpc3BsYXlOYW1lOiAiVGVjaCBDcm9z\ncyIKICB0eXBlOiBidXNpbmVzcy11bml0CiAgcGFyZW50OiBwaWNwYXkKICBj\naGlsZHJlbjogCiAgICAtIHNxdWFkLWNvbW11bmljYXRpb24KICAgIC0gc3F1\nYWQtZmF1c3RhbwogICAgLSBjZXAKICAgIC0gY2VwLXN0cmVhbS10cmliZS1k\nYXRhLWVuZ2luZWVyaW5nCiAgICAtIGNvbW11bmljYXRpb24KICAgIC0gZGF0\nYS1kaXNjb3ZlcnkKICAgIC0gZGF0YS1wZXJzaXN0ZW5jZQogICAgLSBldmVu\ndC1tYW5hZ2VtZW50CiAgICAtIGV2ZW50LXRyYWNraW5nCiAgICAtIHBsYXRh\nZm9ybWEtYXBpCiAgICAtIHNjYWxlLXNlY3VyaXR5CiAgICAtIHNlY3VyaXR5\nLXBqCiAgICAtIHZpYgogICAgLSBhdGxhbnRpcwogICAgLSBkZXZlbG9wZXIt\nZXhwZXJpZW5jZQo=\n',
                encoding: 'base64',
                _links: {
                  self: 'https://self',
                  git: 'https://git',
                  html: 'https://html',
                },
              },
            ],
          };
        }),
      };
    });

    const octokit = new Octokit();
    const githubRepository = new GithubRepository(octokit);

    const contents = await githubRepository.getContents(
      `/repos/PicPay/moonlight-org/contents/picpay/tech_cross/tech-cross-bu.yaml`,
    );

    expect(octokit.request).toHaveBeenCalledWith(
      'GET /repos/PicPay/moonlight-org/contents/picpay/tech_cross/tech-cross-bu.yaml',
    );
    expect(contents).toEqual(
      expect.objectContaining([
        {
          name: 'tech-cross-bu.yaml',
          path: 'picpay/tech_cross/tech-cross-bu.yaml',
          sha: '53e326359b4526ed77182aece1b15ad186ef1249',
          size: 596,
          url: 'https://api.github.com/repos/PicPay/moonlight-org/contents/picpay/tech_cross/tech-cross-bu.yaml?ref=main',
          html_url:
            'https://github.com/PicPay/moonlight-org/blob/main/picpay/tech_cross/tech-cross-bu.yaml',
          git_url:
            'https://api.github.com/repos/PicPay/moonlight-org/git/blobs/53e326359b4526ed77182aece1b15ad186ef1249',
          download_url: 'https://download_url',
          type: 'file',
          content:
            'YXBpVmVyc2lvbjogYmFja3N0YWdlLmlvL3YxYWxwaGExCmtpbmQ6IEdyb3Vw\nCm1ldGFkYXRhOgogIG5hbWU6IHRlY2hfY3Jvc3MKICBkZXNjcmlwdGlvbjog\nIkJVIHJlc3BvbnPDoXZlbCBwZWxhcyBmcmVudGVzIGRlIFByb2R1Y3Rpb24g\nRW5naW5lZXJpbmcsIEdvdmVybmFuw6dhIGUgU2VjdXJpdHkgUGxhdGZvcm0i\nCnNwZWM6CiAgcHJvZmlsZToKICAgIGRpc3BsYXlOYW1lOiAiVGVjaCBDcm9z\ncyIKICB0eXBlOiBidXNpbmVzcy11bml0CiAgcGFyZW50OiBwaWNwYXkKICBj\naGlsZHJlbjogCiAgICAtIHNxdWFkLWNvbW11bmljYXRpb24KICAgIC0gc3F1\nYWQtZmF1c3RhbwogICAgLSBjZXAKICAgIC0gY2VwLXN0cmVhbS10cmliZS1k\nYXRhLWVuZ2luZWVyaW5nCiAgICAtIGNvbW11bmljYXRpb24KICAgIC0gZGF0\nYS1kaXNjb3ZlcnkKICAgIC0gZGF0YS1wZXJzaXN0ZW5jZQogICAgLSBldmVu\ndC1tYW5hZ2VtZW50CiAgICAtIGV2ZW50LXRyYWNraW5nCiAgICAtIHBsYXRh\nZm9ybWEtYXBpCiAgICAtIHNjYWxlLXNlY3VyaXR5CiAgICAtIHNlY3VyaXR5\nLXBqCiAgICAtIHZpYgogICAgLSBhdGxhbnRpcwogICAgLSBkZXZlbG9wZXIt\nZXhwZXJpZW5jZQo=\n',
          encoding: 'base64',
          _links: {
            self: 'https://self',
            git: 'https://git',
            html: 'https://html',
          },
        },
      ]),
    );
  });
});
