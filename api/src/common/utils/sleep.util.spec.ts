import { sleep } from './sleep.util';

describe('sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not resolve before the given delay has elapsed', async () => {
    const resolved = jest.fn();
    sleep(1000).then(resolved);

    await Promise.resolve();
    jest.advanceTimersByTime(999);
    await Promise.resolve();

    expect(resolved).not.toHaveBeenCalled();
  });

  it('resolves once the given delay has elapsed', async () => {
    const resolved = jest.fn();
    sleep(1000).then(resolved);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it('schedules setTimeout with exactly the requested delay', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    void sleep(250);

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 250);
  });
});
