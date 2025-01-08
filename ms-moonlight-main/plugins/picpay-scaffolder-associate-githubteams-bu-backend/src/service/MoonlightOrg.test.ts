import { MoonlightOrgYaml } from '../model/MoonlighOrgYaml';
import MoonlightOrg, { MoonlightOrgOptions } from '../service/MoonlightOrg';

describe('MoonlightOrg', () => {
  let github: any;
  let options: MoonlightOrgOptions;
  const bu = 'bu-test';
  const team = 'team-test';
  const pathRepo =
    '/repos/PicPay/moonlight-org/contents/picpay/bu_test/bu-test-bu.yaml';
  const pathTemp = '/tmp';
  const owner = 'PicPay';
  const repository = 'moonlight-org';

  beforeEach(() => {
    const GithubRepository = jest.fn().mockImplementation(() => ({
      getContents: jest.fn().mockResolvedValue({
        name: 'tech-cross-bu.yaml',
        path: 'picpay/tech_cross/tech-cross-bu.yaml',
        sha: '53e326359b4526ed77182aece1b15ad186ef1249',
        size: 596,
        url: 'https://url',
        html_url: 'https://html_url',
        git_url: 'https://git_url',
        download_url: 'https://download_url',
        type: 'file',
        content:
          'ewoJIm1vb25saWdodCI6ICJmb29iYXIiLAoJInNwZWMiOiB7CgkJImNoaWxkcmVuIjogWwoJCQkidGVhbS1hIiwKCQkJInRlYW0tYiIsCgkJCSJ0ZWFtLWMiCgkJXQoJfQp9',
        encoding: 'base64',
        _links: {
          self: 'https://self',
          git: 'https://git',
          html: 'https://html',
        },
      }),
    }));

    github = new GithubRepository();

    options = {
      bu,
      team,
      pathRepo,
      pathTemp,
      owner,
      repository,
      github,
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Should Initialize MoonlightOrg Class', () => {
    const moonlightOrg = new MoonlightOrg(options);
    expect(moonlightOrg).toBeInstanceOf(MoonlightOrg);
  });

  it('Should get content as object', async () => {
    const moonlightOrg = new MoonlightOrg(options);
    const content: MoonlightOrgYaml = await moonlightOrg.getContent();

    expect(github.getContents).toHaveBeenCalled();
    expect(github.getContents).toHaveBeenCalledTimes(1);
    expect(content).toEqual(
      expect.objectContaining({
        moonlight: 'foobar',
      }),
    );
  });

  it('Should adding new team to content', async () => {
    const moonlightOrg = new MoonlightOrg(options);
    const content: MoonlightOrgYaml = await moonlightOrg.getContent();

    const spySaveContent = jest
      .spyOn(moonlightOrg, 'saveContent')
      .mockImplementation(() => ({
        moonlight: 'foobar',
        spec: {
          children: ['team-a', 'team-b', 'team-c', 'team-test'],
        },
      }));

    await moonlightOrg.changeContent(content);

    expect(github.getContents).toHaveBeenCalled();
    expect(github.getContents).toHaveBeenCalledTimes(1);
    expect(content).toEqual({
      moonlight: 'foobar',
      spec: {
        children: ['team-a', 'team-b', 'team-c', 'team-test'],
      },
    });
    expect(spySaveContent).toHaveBeenCalledTimes(1);
  });

  it('Should`t adding new team to content', async () => {
    const moonlightOrg = new MoonlightOrg({ ...options, team: 'team-a' });
    const content: MoonlightOrgYaml = await moonlightOrg.getContent();

    const spySaveContent = jest
      .spyOn(moonlightOrg, 'saveContent')
      .mockImplementation(() => ({}));

    await moonlightOrg.changeContent(content);

    expect(github.getContents).toHaveBeenCalled();
    expect(github.getContents).toHaveBeenCalledTimes(1);
    expect(content).toEqual({
      moonlight: 'foobar',
      spec: {
        children: ['team-a', 'team-b', 'team-c'],
      },
    });
    expect(spySaveContent).not.toHaveBeenCalled();
  });
});
