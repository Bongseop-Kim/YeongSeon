type MockFileReaderOptions = {
  result?: string | null;
  error?: unknown;
};

export class MockFileReader {
  static nextOptions: MockFileReaderOptions = {};

  result: string | null = null;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  static configure(options: MockFileReaderOptions) {
    MockFileReader.nextOptions = options;
  }

  static reset() {
    MockFileReader.nextOptions = {};
  }

  readAsDataURL() {
    const { result = "data:image/png;base64,ci-base64", error } =
      MockFileReader.nextOptions;
    MockFileReader.reset();

    if (error !== undefined) {
      this.onerror?.();
      return;
    }

    this.result = result;
    this.onload?.();
  }
}
