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

  readAsDataURL() {
    const { result = "data:image/png;base64,ci-base64", error } =
      MockFileReader.nextOptions;
    MockFileReader.nextOptions = {};

    if (error) {
      this.onerror?.();
      return;
    }

    this.result = result;
    this.onload?.();
  }
}
