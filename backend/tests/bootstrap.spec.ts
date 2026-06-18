process.env.LIVE = 'false';
process.env.PORT = '4321'; // exercise the configured-port branch

import { app, bootstrap, startServer } from '../src/main/server';

describe('server bootstrap', () => {
  let listenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    listenSpy = jest.spyOn(app, 'listen').mockImplementation(((_port: unknown, cb?: () => void) => {
      cb?.();
      return { close: jest.fn() } as never;
    }) as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('does not start a listener under the test environment', () => {
    expect(bootstrap('test')).toBe(false);
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('starts a listener for non-test environments', () => {
    expect(bootstrap('production')).toBe(true);
    expect(listenSpy).toHaveBeenCalledTimes(1);
  });

  it('startServer binds to the provided port and logs', () => {
    const server = startServer(0);
    expect(listenSpy).toHaveBeenCalledWith(0, expect.any(Function));
    expect(server).toBeDefined();
  });
});
